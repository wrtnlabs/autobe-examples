import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Validate that moderator login is only accessible via HTTPS.
 *
 * This test verifies the security policy that authentication endpoints must be
 * accessed over HTTPS to prevent credential exposure over unencrypted
 * connections. According to the API specification, the moderator login endpoint
 * (/auth/moderator/login) is designed to reject HTTP requests by returning
 * either a 301 redirect to the HTTPS version or a 403 Forbidden error.
 *
 * This test follows the principle that API endpoints handling sensitive
 * authentication data must enforce TLS/HTTPS, as stated in the
 * IAuthorizationToken documentation: "Sent over HTTPS only".
 *
 * Test steps:
 *
 * 1. Create an HTTP connection (non-secure) to the API endpoint
 * 2. Attempt to call the moderator login API over HTTP
 * 3. Verify the server responds with 301 redirect or 403 Forbidden
 * 4. Confirm the web server enforces HTTPS only policy
 */
export async function test_api_moderator_login_is_https_only(
  connection: api.IConnection,
) {
  // Create a parallel HTTP connection without HTTPS protocol
  const httpConnection: api.IConnection = {
    ...connection,
    host: connection.host.replace(/^https:/, "http:"),
    headers: connection.headers,
  };

  // Attempt to login over HTTP - this should fail with 301 or 403
  await TestValidator.error(
    "moderator login via HTTP should be rejected",
    async () => {
      await api.functional.auth.moderator.login(httpConnection, {
        body: "user@example.com" satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );
}
