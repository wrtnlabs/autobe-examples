import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.paragraph({ sentences: 1 }),
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com/signup",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Extract valid refresh token and test it works first
  const validRefreshToken = member.token.refresh;
  const refreshedMember = await api.functional.auth.member.refresh(connection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IDiscussionBoardMember.IRefresh,
  });
  typia.assert(refreshedMember);

  // Step 3: Attempt refresh with corrupted token data
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: "invalid_token_corrupted_data",
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });

  // Step 4: Attempt refresh with empty token
  await TestValidator.error("empty refresh token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });

  // Step 5: Attempt refresh with malformed data
  await TestValidator.error("malformed refresh token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: "not_a_valid_jwt_token.123456789",
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });
}
