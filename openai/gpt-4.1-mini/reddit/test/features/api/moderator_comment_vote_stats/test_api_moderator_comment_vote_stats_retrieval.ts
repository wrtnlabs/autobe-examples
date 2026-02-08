import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteOfUserStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUserStat";
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

export async function test_api_moderator_comment_vote_stats_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Moderator authentication setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Since ICommunityPlatformModerator.IJoin is an empty object, create an empty join request body
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  // Update connection with moderator authorization token
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorizedModerator.token.access}`,
  };
  // We need a commentId to test the vote stats retrieval;
  // Because we don't have creation API for comments or votes in provided functions,
  // assume we use a random valid UUID for commentId for testing purpose
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the vote statistics for the specific comment
  const voteStats =
    await api.functional.communityPlatform.moderator.comments.vote_stats.voteStats(
      moderatorConnection,
      { commentId },
    );
  // Validate the response matches the expected schema
  typia.assert(voteStats);
  // Additional business logic validations can be added here if schema had details (which it doesn't)
  // For example: TestValidator.predicate("upvotes not negative", voteStats.upvotes >= 0);
  // However, since the properties of ICommunityPlatformCommentVoteOfUserStat are not defined,
  // validate only the type correctness with typia.assert
}
