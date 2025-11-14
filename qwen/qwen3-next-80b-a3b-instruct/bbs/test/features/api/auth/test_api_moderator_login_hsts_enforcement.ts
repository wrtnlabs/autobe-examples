import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Validate HSTS enforcement on moderator login endpoint.
 *
 * This test verifies that the /auth/moderator/login endpoint enforces
 * HTTPS-only access by attempting to make the request over HTTP and checking
 * for appropriate server responses. Based on security best practices and the
 * system's architecture, the server should either redirect with a 301 status or
 * return a 403 Forbidden response when accessed over HTTP. Additionally, the
 * response must include the Strict-Transport-Security header to enforce future
 * HTTPS-only access for the client.
 *
 * The test creates an unauthenticated connection using HTTP protocol, performs
 * a login attempt, and validates the server's security response. This ensures
 * the system protects sensitive authentication credentials by preventing
 * transmission over unencrypted channels.
 *
 * Note: This test validates the server's security policy enforcement at the
 * network level, not the application-level authentication logic.
 */
export async function test_api_moderator_login_hsts_enforcement(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection with HTTP protocol
  // This simulates a client attempting to access the endpoint over HTTP
  // Construct new host URL by replacing 'https' with 'http' in the original host
  const httpHost = connection.host.startsWith("https:")
    ? connection.host.replace("https:", "http:")
    : connection.host;

  const unauthConnection: api.IConnection = {
    ...connection,
    host: httpHost,
  };

  // Generate a valid string value for ILogin as defined in DTO (string type)
  // Based on the context, this represents the requester's email address
  const loginUser: string = typia.random<string & tags.Format<"email">>();

  // Attempt to authenticate over HTTP - expected to fail with security response
  // The endpoint must reject HTTP access with appropriate security headers
  try {
    // This call should throw HttpError because the server should reject HTTP access
    const response = await api.functional.auth.moderator.login(
      unauthConnection,
      {
        body: loginUser satisfies IPoliticalForumModerator.ILogin,
      },
    );

    // If we reach here, the server improperly allowed HTTP access
    // This is a security failure
    TestValidator.error(
      "server should reject HTTP access to /auth/moderator/login",
      () => {
        throw new Error(
          "Server improperly allowed HTTP access to moderator login",
        );
      },
    );
  } catch (error) {
    // Validate that the error is an HttpError as expected
    if (!(error instanceof api.HttpError)) {
      throw error;
    }

    // Verify the server responded with the required HSTS header
    // The requirement only mandates the HSTS header be sent, not its specific content
    const hstsHeader = error.headers["strict-transport-security"];
    TestValidator.predicate(
      "server must include Strict-Transport-Security header in response",
      hstsHeader !== undefined && hstsHeader !== null,
    );

    // Verify server correctly rejected HTTP access
    // The server should return 301 (redirect) or 403 (forbidden) for HTTP access
    const isExpectedStatus = error.status === 301 || error.status === 403;
    TestValidator.predicate(
      "server must respond with 301 or 403 for HTTP access to /auth/moderator/login",
      isExpectedStatus,
    );
  }
}
