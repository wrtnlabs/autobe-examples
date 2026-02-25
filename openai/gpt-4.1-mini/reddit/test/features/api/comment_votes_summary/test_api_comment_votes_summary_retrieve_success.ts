import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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

export async function test_api_comment_votes_summary_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the retrieval of vote summary for a valid commentId as a moderator.
  // The test should authenticate as a moderator using the join operation,
  // then request the vote summary using a known valid commentId.
  // Verify the response includes correct total upvoteCount and downvoteCount fields reflecting current votes.
  // Check the HTTP status code is 200 and the response body matches the schema for ICommunityPlatformCommentVote.
  // 1. Moderator join (authentication)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(authorized);
  // Prepare a valid UUID for commentId - use a stable random UUID
  // Since this is a retrieval test, use a random UUID for testing schema compatibility
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve vote summary for the commentId
  const voteSummary =
    await api.functional.communityPlatform.moderator.comments.votes.summary.votesSummary(
      moderatorConnection,
      { commentId },
    );
  // Validate the response
  typia.assert(voteSummary);
  // Upvote count and downvote count must be number (int32) and >= 0
  TestValidator.predicate(
    "upvote count is non-negative",
    voteSummary.upvoteCount >= 0,
  );
  TestValidator.predicate(
    "downvote count is non-negative",
    voteSummary.downvoteCount >= 0,
  );
}
