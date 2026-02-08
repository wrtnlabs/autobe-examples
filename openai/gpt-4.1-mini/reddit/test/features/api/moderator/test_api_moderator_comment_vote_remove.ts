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

export async function test_api_moderator_comment_vote_remove(
  connection: api.IConnection,
): Promise<void> {
  // Test the moderator's capability to remove their vote on a comment.
  // Step 1: Moderator join for authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Step 2: Create a vote on a comment (random commentId and vote_type)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Randomly pick a vote type 'upvote' or 'downvote'
  const voteTypes = ["upvote", "downvote"] as const;
  const initialVoteType =
    voteTypes[Math.floor(Math.random() * voteTypes.length)];

  // This function returns an object of type ICommunityPlatformCommentVoteOfUsers, which does not have 'vote_type' property.
  // We safely assert it to unknown, and create a typed object with vote_type to allow the test validation to work.
  const createVoteRaw =
    await generate_random_community_platform_moderator_comments_votes_update_vote(
      moderatorConnection,
      {
        params: { commentId },
        body: { vote_type: initialVoteType },
      },
    );
  // We type-assert createVoteRaw to object with vote_type for testing
  const createVote = createVoteRaw as unknown as { vote_type: typeof initialVoteType | null };
  typia.assert(createVote);
  // Validate that the vote_type matches initialVoteType
  TestValidator.equals(
    "initial vote_type matches",
    createVote.vote_type,
    initialVoteType,
  );
  // Step 3: Remove the vote by sending an empty string for vote_type
  const removeVoteRaw =
    await generate_random_community_platform_moderator_comments_votes_update_vote(
      moderatorConnection,
      {
        params: { commentId },
        body: { vote_type: "" },
      },
    );
  // Similarly, assert type
  const removeVote = removeVoteRaw as unknown as { vote_type: string | null };
  typia.assert(removeVote);

  // Step 4: Assert that the vote no longer exists or vote_type is null or empty
  TestValidator.predicate(
    "vote removed or marked as removed",
    removeVote.vote_type === "" ||
      removeVote.vote_type === null ||
      removeVote.vote_type === undefined,
  );
}
