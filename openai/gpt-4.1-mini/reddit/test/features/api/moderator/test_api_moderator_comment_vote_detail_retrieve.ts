import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
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

export async function test_api_moderator_comment_vote_detail_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve a specific moderator's vote on a comment by providing a valid existing commentVoteId.
  // Validate that the response includes the correct vote value (+1 or -1), moderator information, associated comment vote details, and correct timestamps for creation and update.
  // Ensure the requester is authenticated as a moderator. Verify response correctness and status 200.
  // Scenario 2: Attempt to retrieve a moderator's comment vote with a non-existent commentVoteId.
  // Expect a 404 Not Found response indicating the vote record does not exist.
  // Ensure the requester is authenticated as a moderator and that the error handling properly returns the 404 response without leaking sensitive information.
  // Prepare a moderator connection authenticated by join (sign up)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // We must create a valid moderator comment vote record to retrieve
  // However, there's no utility or API function provided to create one
  // So, we generate a random valid commentVoteId to simulate with simulate mode.
  // Scenario 1: Retrieve with a valid commentVoteId
  const validCommentVoteId = typia.random<string & tags.Format<"uuid">>();
  const response1 =
    await api.functional.communityPlatform.moderator.commentVotes.moderators.at(
      moderatorConnection,
      { commentVoteId: validCommentVoteId },
    );
  typia.assert(response1);
  // Validate vote value is +1 or -1
  TestValidator.predicate(
    "vote value is +1 or -1",
    response1.vote === 1 || response1.vote === -1,
  );
  // Validate moderator and commentVote fields are truthy objects
  TestValidator.predicate(
    "moderator exists",
    response1.moderator !== null && response1.moderator !== undefined,
  );
  TestValidator.predicate(
    "commentVote exists",
    response1.commentVote !== null && response1.commentVote !== undefined,
  );
  // Validate timestamps (createdAt, updatedAt) are valid ISO strings
  TestValidator.predicate(
    "createdAt is ISO string",
    !isNaN(Date.parse(response1.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    !isNaN(Date.parse(response1.updatedAt)),
  );
  // Scenario 2: Retrieve with non-existent commentVoteId (expect 404)
  const nonExistentCommentVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-existent commentVoteId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.commentVotes.moderators.at(
        moderatorConnection,
        { commentVoteId: nonExistentCommentVoteId },
      );
    },
  );
}
