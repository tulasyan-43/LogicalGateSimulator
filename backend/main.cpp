#define _WIN32_WINNT 0x0A00

#include <iostream>
#include <string>
#include <cctype>
#include "httplib.h"

using namespace std;

// Perform the selected logic gate operation
int performOperation(string operation, int A, int B)
{
    if (operation == "AND") return A && B;
    if (operation == "OR") return A || B;
    if (operation == "NOT") return !A;
    if (operation == "NAND") return !(A && B);
    if (operation == "NOR") return !(A || B);
    if (operation == "XOR") return A != B;
    if (operation == "XNOR") return A == B;

    return -1;
}

int main()
{
    httplib::Server server;

    // Serve the frontend files through the C++ server
    if (!server.set_mount_point("/", "../frontend"))
    {
        cerr << "Error: Could not find the frontend folder.\n";
        return 1;
    }

    // API endpoint for logic gate calculations
    server.Post("/api/gate", [](const httplib::Request& req,
                                httplib::Response& res)
    {
        if (!req.has_param("operation") ||
            !req.has_param("A"))
        {
            res.status = 400;
            res.set_content(
                R"({"error":"Operation and input A are required"})",
                "application/json"
            );
            return;
        }

        string operation = req.get_param_value("operation");
        int A, B = 0;

        for (char& ch : operation)
        {
            ch = toupper(static_cast<unsigned char>(ch));
        }

        try
        {
            string aValue = req.get_param_value("A");

            if (aValue != "0" && aValue != "1")
                throw invalid_argument("Invalid A");

            A = stoi(aValue);

            if (operation != "NOT")
            {
                if (!req.has_param("B"))
                    throw invalid_argument("Missing B");

                string bValue = req.get_param_value("B");

                if (bValue != "0" && bValue != "1")
                    throw invalid_argument("Invalid B");

                B = stoi(bValue);
            }
        }
        catch (...)
        {
            res.status = 400;
            res.set_content(
                R"({"error":"Inputs must be 0 or 1"})",
                "application/json"
            );
            return;
        }

        int result = performOperation(operation, A, B);

        if (result == -1)
        {
            res.status = 400;
            res.set_content(
                R"({"error":"Invalid logic gate operation"})",
                "application/json"
            );
            return;
        }

        string response =
            "{\"operation\":\"" + operation +
            "\",\"A\":" + to_string(A) +
            ",\"result\":" + to_string(result);

        if (operation != "NOT")
        {
            response += ",\"B\":" + to_string(B);
        }

        response += "}";

        res.set_content(response, "application/json");
    });

    cout << "====================================\n";
    cout << "       LOGICLAB WEB SERVER\n";
    cout << "====================================\n";
    cout << "Open your website at:\n";
    cout << "http://localhost:8080\n";
    cout << "\nPress Ctrl+C to stop the server.\n";

    // Start the server
    if (!server.listen("127.0.0.1", 8080))
    {
        cerr << "Could not start server on port 8080.\n";
        return 1;
    }

    return 0;
}