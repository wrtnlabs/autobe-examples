import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh rejection when using an invalid or malformed refresh
 * token.
 *
 * This test validates security by ensuring that the token refresh endpoint
 * properly rejects invalid refresh tokens and does not issue new authentication
 * tokens for unauthorized refresh attempts.
 *
 * Test flow:
 *
 * 1. Create a valid member account to establish authentication context
 * 2. Generate an invalid refresh token (random string that is not a valid JWT)
 * 3. Attempt to refresh tokens using the invalid token
 * 4. Verify that the refresh operation fails with appropriate error
 * 5. Confirm that no new tokens are issued for the invalid refresh attempt
 */
export async function test_api_member_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account to establish context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Generate a completely invalid refresh token (random alphanumeric string)
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);

  // Step 3: Attempt to refresh tokens using the invalid token
  // This should fail because the token is not valid
  await TestValidator.error(
    "token refresh should fail with invalid token",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );
}
