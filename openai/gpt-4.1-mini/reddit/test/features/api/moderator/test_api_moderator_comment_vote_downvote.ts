import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_comments_votes_update_vote } from "../../../generate/generate_random_community_platform_moderator_comments_votes_update_vote";
import { prepare_random_community_platform_comment_vote_of_users } from "../../../prepare/prepare_random_community_platform_comment_vote_of_users";

export async function test_api_moderator_comment_vote_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Test the moderator's ability to downvote a comment.
  // 1. Authenticate as a moderator.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Prepare a comment UUID to downvote.
  // Since no comment creation API or comment data provided, we generate a random UUID.
  // NOTE: In a real scenario, you'd create or fetch a valid comment.
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt downvote on the comment
  const downvoteBody = {
    vote_type: "downvote",
  } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate;
  const firstDownvote =
    await generate_random_community_platform_moderator_comments_votes_update_vote(
      moderatorConnection,
      { body: downvoteBody, params: { commentId } },
    );
  typia.assert(firstDownvote);
  // 4. Attempt second downvote on the same comment by the same moderator (should prevent or not change)
  await TestValidator.error(
    "should prevent repeated downvotes on the same comment",
    async () => {
      await generate_random_community_platform_moderator_comments_votes_update_vote(
        moderatorConnection,
        { body: downvoteBody, params: { commentId } },
      );
    },
  );
}
