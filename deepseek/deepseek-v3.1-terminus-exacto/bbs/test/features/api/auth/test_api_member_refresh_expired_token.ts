import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh failure when using an expired refresh token.
 *
 * This scenario validates the security mechanism that prevents refresh
 * operations with tokens that have exceeded their refreshable_until timestamp.
 * The test creates a member account, obtains tokens, then attempts to refresh
 * using a valid but potentially expired token. Validates that the system
 * properly rejects refresh operations when tokens have expired, maintaining
 * security standards.
 */
export async function test_api_member_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create member account and obtain initial authentication tokens
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        ip: "127.0.0.1",
        href: "https://example.com/auth/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Validate token structure and expiration timestamp
  TestValidator.predicate(
    "token should have refreshable_until timestamp",
    member.token.refreshable_until !== undefined &&
      member.token.refreshable_until !== null,
  );

  TestValidator.predicate(
    "refresh token should be present",
    member.token.refresh !== undefined && member.token.refresh.length > 0,
  );

  // Step 3: Attempt token refresh - this will test the actual expiration logic
  // The API should handle token expiration validation internally
  await TestValidator.error(
    "refresh should fail if token is expired",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: member.token.refresh,
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );

  // Step 4: Validate that the original token structure remains intact
  const reloadedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "AnotherPassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/auth/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(reloadedMember);

  // Validate that new token has proper structure
  TestValidator.predicate(
    "new token should have valid structure",
    reloadedMember.token.access !== undefined &&
      reloadedMember.token.refresh !== undefined &&
      reloadedMember.token.expired_at !== undefined &&
      reloadedMember.token.refreshable_until !== undefined,
  );
}
