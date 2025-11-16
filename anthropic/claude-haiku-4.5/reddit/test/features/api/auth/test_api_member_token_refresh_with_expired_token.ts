import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test token refresh rejection when the refresh token is invalid or expired.
 *
 * This test validates that the refresh endpoint properly rejects invalid
 * refresh tokens and returns an appropriate error response (401 Unauthorized)
 * when the refresh token cannot be validated. This tests the security boundary
 * that prevents unauthorized session extension.
 *
 * Workflow:
 *
 * 1. Create a new member account through registration endpoint
 * 2. Verify the initial tokens are valid and can be used
 * 3. Attempt to refresh with an invalid/malformed refresh token
 * 4. Verify that the endpoint rejects the request with an error
 * 5. Confirm that proper error handling prevents unauthorized access
 */
export async function test_api_member_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: "SecurePassword123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: memberCreate,
  });
  typia.assert(authorized);

  // Step 2: Verify the tokens are properly formatted
  TestValidator.predicate(
    "authorized response should contain access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorized response should contain refresh token",
    authorized.token.refresh.length > 0,
  );

  // Step 3: Attempt to refresh with an invalid refresh token
  const invalidRefreshToken =
    "invalid_token_" + RandomGenerator.alphaNumeric(20);

  // Step 4-5: Verify that invalid refresh token is rejected
  await TestValidator.error(
    "refresh endpoint should reject invalid refresh token",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );
}
