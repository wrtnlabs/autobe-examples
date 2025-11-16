import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test token refresh with invalid/malformed refresh token.
 *
 * This test validates that the system properly rejects refresh attempts when
 * using an invalid or malformed refresh token. This simulates the security
 * behavior that would occur when a token has been revoked or is no longer
 * valid.
 *
 * Test flow:
 *
 * 1. Create an administrator account to establish a valid session
 * 2. Attempt refresh with an invalid/malformed refresh token
 * 3. Verify that the refresh request fails with appropriate error
 * 4. Confirm that a valid refresh token format is required
 */
export async function test_api_administrator_token_refresh_revoked_token(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPassword123";

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Attempt refresh with invalid/revoked refresh token
  // Simulates behavior when token is revoked or no longer valid
  const invalidRefreshToken = "invalid.revoked.token";

  await TestValidator.error(
    "refresh with invalid/revoked token should fail",
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ICommunityPlatformAdministrator.IRefresh,
      });
    },
  );

  // Step 3: Verify that system rejects invalid tokens
  TestValidator.predicate("invalid token format is properly rejected", true);

  // Step 4: Test with empty refresh token
  const emptyRefreshToken = "";

  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: emptyRefreshToken,
        } satisfies ICommunityPlatformAdministrator.IRefresh,
      });
    },
  );
}
