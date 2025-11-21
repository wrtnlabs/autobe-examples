import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator token refresh with invalid token format.
 *
 * This scenario validates system security by attempting to refresh a session
 * using malformed or corrupted refresh tokens. Verify that the system properly
 * validates token format and rejects invalid requests with appropriate error
 * responses, preventing potential security vulnerabilities through token
 * manipulation.
 */
export async function test_api_admin_refresh_token_invalid(
  connection: api.IConnection,
) {
  // Create a request body with intentionally invalid refresh token
  const invalidRequestBody = {
    refresh_token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.malformed_signature_that_should_be_rejected",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdministrator.IRefresh;

  // Attempt to refresh token with invalid format
  await TestValidator.error(
    "refresh should fail with invalid token format",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: invalidRequestBody,
      });
    },
  );
}
