import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

export async function test_api_post_vote_clear_target_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate error on clearing a post vote for a non-existent post.
   *
   * Steps:
   *
   * 1. Join as a member user to obtain an authenticated context
   * 2. Attempt DELETE vote against a random UUID (non-existent post)
   * 3. Assert that an error is thrown (do not assert specific status codes)
   */

  // 1) Join as member user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphabets(8); // matches ^[A-Za-z0-9_]{3,20}$
  const password: string = `a1${RandomGenerator.alphaNumeric(10)}`; // ensure >= 8 chars with letter+digit
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const authorized: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        email,
        username,
        password,
        terms_accepted_at: nowIso,
        privacy_accepted_at: nowIso,
      } satisfies ICommunityPlatformMemberUser.ICreate,
    });
  typia.assert(authorized);

  // 2) Prepare non-existent post ID (random UUID)
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Attempt to clear vote and expect error (no status code assertion)
  await TestValidator.error(
    "clearing vote on non-existent post should raise an error",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.vote.erase(
        connection,
        { postId: nonExistentPostId },
      );
    },
  );
}
