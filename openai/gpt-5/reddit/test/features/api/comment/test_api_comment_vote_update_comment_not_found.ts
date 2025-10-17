import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

export async function test_api_comment_vote_update_comment_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate error on updating a vote for a non-existent comment.
   *
   * Steps:
   *
   * 1. Join as a member user to obtain an authenticated session.
   * 2. Generate a random UUID for a non-existing commentId.
   * 3. Attempt to upsert vote with value=+1 and expect an error.
   */
  // 1) Authenticate member via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: "Pwd12345!", // meets policy: >=8 chars, letters+digits present
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Prepare a non-existent comment id
  const unknownCommentId = typia.random<string & tags.Format<"uuid">>();

  // 3) Try to update vote and expect an error (not-found). Do not assert status code.
  await TestValidator.error(
    "updating a vote on a non-existent comment should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.vote.update(
        connection,
        {
          commentId: unknownCommentId,
          body: { value: 1 } satisfies ICommunityPlatformCommentVote.IUpdate,
        },
      );
    },
  );
}
