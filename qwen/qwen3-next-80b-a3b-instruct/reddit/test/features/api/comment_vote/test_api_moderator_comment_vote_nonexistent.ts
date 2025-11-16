import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_comment_vote_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail satisfies IModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Attempt to vote on a non-existent comment
  // This should fail with a 404 error since the comment doesn't exist
  const communityCode = RandomGenerator.alphaNumeric(16);
  const postCode = RandomGenerator.alphaNumeric(16);
  const commentCode = RandomGenerator.alphaNumeric(16);

  await TestValidator.error(
    "should reject vote on non-existent comment",
    async () => {
      await api.functional.communityPlatform.moderator.communities.posts.comments.votes.at(
        connection,
        {
          communityCode,
          postCode,
          commentCode,
        },
      );
    },
  );
}
