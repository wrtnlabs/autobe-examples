import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { generate_random_community_platform_moderator_comments_votes_update_vote } from "../../../generate/generate_random_community_platform_moderator_comments_votes_update_vote";

export async function test_api_moderator_comment_vote_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Moderator Authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinBody: ICommunityPlatformModerator.IJoin = {};
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Prepare a commentId (random UUID)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Upvote the comment once
  const firstVote = await generate_random_community_platform_moderator_comments_votes_update_vote(
    moderatorConnection,
    {
      params: { commentId },
      body: { vote_type: "upvote" },
    },
  );
  typia.assert(firstVote);
  // Attempt duplicate upvote and expect error
  await TestValidator.error(
    "should prevent multiple upvotes from the same moderator",
    async () => {
      await generate_random_community_platform_moderator_comments_votes_update_vote(
        moderatorConnection,
        {
          params: { commentId },
          body: { vote_type: "upvote" },
        },
      );
    },
  );
}
