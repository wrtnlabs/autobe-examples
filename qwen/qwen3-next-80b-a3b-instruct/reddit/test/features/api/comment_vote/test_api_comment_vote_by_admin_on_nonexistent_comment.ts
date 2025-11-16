import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";

export async function test_api_comment_vote_by_admin_on_nonexistent_comment(
  connection: api.IConnection,
) {
  const communityCode = RandomGenerator.alphaNumeric(16);
  const postCode = RandomGenerator.alphaNumeric(16);
  const commentCode = RandomGenerator.alphaNumeric(16);

  // Attempt to vote on non-existent comment - should result in 404
  await TestValidator.error(
    "should return 404 for nonexistent comment",
    async () => {
      await api.functional.communityPlatform.admin.communities.posts.comments.votes.create(
        connection,
        {
          communityCode,
          postCode,
          commentCode,
          body: {
            vote_type: "upvote",
          } satisfies ICommunityPlatformCommentVote.IRequest,
        },
      );
    },
  );
}
