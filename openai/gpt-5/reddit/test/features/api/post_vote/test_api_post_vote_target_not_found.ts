import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Verify voting fails on a non-existent post.
 *
 * Business context:
 *
 * - Voting is a protected member action. A user must be authenticated.
 * - When the target post does not exist, the vote endpoint must fail.
 *
 * Steps:
 *
 * 1. Join as a member user to obtain authorization.
 * 2. Attempt to PUT a vote against a random UUID that does not correspond to any
 *    post.
 * 3. Verify an error is thrown (do not assert specific HTTP status codes).
 * 4. Repeat the attempt with the same UUID and a different vote value; it still
 *    must error.
 */
export async function test_api_post_vote_target_not_found(
  connection: api.IConnection,
) {
  // 1) Join as a member to obtain authorization
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12), // matches ^[A-Za-z0-9_]{3,20}$
      password: RandomGenerator.alphaNumeric(12), // letters+digits, length >= 8
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      // marketing_opt_in omitted (optional)
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(authorized);

  // 2) Attempt vote on a random non-existent post UUID
  const missingPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "voting a non-existent post must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.vote.setVote(
        connection,
        {
          postId: missingPostId,
          body: { value: 1 } satisfies ICommunityPlatformPostVote.IUpdate,
        },
      );
    },
  );

  // 3) Repeat with different value to ensure consistent failure (no record created)
  await TestValidator.error(
    "repeating on the same non-existent post must still fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.vote.setVote(
        connection,
        {
          postId: missingPostId,
          body: { value: -1 } satisfies ICommunityPlatformPostVote.IUpdate,
        },
      );
    },
  );
}
