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
import { generate_random_community_platform_comment_votes_create } from "../../../generate/generate_random_community_platform_comment_votes_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";

export async function test_api_moderator_comment_vote_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Fail to update the moderator's vote when the vote record does not exist.
  // Preconditions:
  //   - Moderator authenticated.
  //   - Attempt to update a non-existent commentVoteId.
  // Steps:
  //   1. Moderator sends a PUT request with a non-existent UUID commentVoteId.
  //   2. Server validates absence and returns a 404 Not Found error.
  //   3. Assert the error message is appropriate.
  //
  // Dependencies:
  // - Moderator join to authenticate.
  // - Create the comment vote entity to ensure system context.
  //
  // No moderator comment vote creation dependency because record is absent.
  // Prepare moderator join
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody: Partial<ICommunityPlatformModerator.IJoin> = {};
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorAuthorized);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // Create a comment vote entity for system context
  // Use normal (non-moderator) context for creation
  const userCommentVoteConnection: api.IConnection = { host: connection.host };
  await generate_random_community_platform_comment_votes_create(
    userCommentVoteConnection,
    {
      body: undefined,
    },
  );
  // Attempt to update a non-existent commentVoteId with PUT
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: ICommunityPlatformCommentVoteOfModerator.IUpdate = {
    vote: 1, // +1 or -1 allowed
  };
  await TestValidator.httpError(
    "update non-existent moderator comment vote should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.commentVotes.moderators.update(
        moderatorConnection,
        {
          commentVoteId: nonExistentVoteId,
          body: updateBody,
        },
      );
    },
  );
}
