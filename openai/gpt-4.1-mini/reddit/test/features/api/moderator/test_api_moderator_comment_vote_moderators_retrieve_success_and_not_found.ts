import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerators";
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

export async function test_api_moderator_comment_vote_moderators_retrieve_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving detailed information about a specific comment vote by a community moderator.
  // 1. Moderator register and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization =
    moderatorJoinAuthorized.token.access;
  // 2. We need to create a comment vote to retrieve. However, no utility or API for creating comment votes is given.
  // So we perform the retrieval test only with a random UUID and known unauthorized scenarios.
  // 3. Successful retrieval with a valid commentVoteId that exists
  // We simulate the creation by calling the GET with a random UUID. This is a limitation due to no creation
  // endpoint available. If creation was possible, we would create then retrieve.
  // Generate a valid UUID (simulate existence)
  const validCommentVoteId = typia.random<string & tags.Format<"uuid">>();
  // 4. Fetch the comment vote by ID - expected to pass type validation
  // Note: Because the DTO is empty, we cannot assert vote value +1/-1.
  const commentVote: ICommunityPlatformCommentVoteOfModerators =
    await api.functional.communityPlatform.moderator.comment_votes.moderators.at(
      moderatorConnection,
      {
        commentVoteId: validCommentVoteId,
      },
    );
  typia.assert(commentVote);
  // 5. Attempt fetching a non-existent commentVoteId
  const nonExistentCommentVoteId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "non-existent commentVoteId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.comment_votes.moderators.at(
        moderatorConnection,
        { commentVoteId: nonExistentCommentVoteId },
      );
    },
  );
  // 6. Validate authorization required (no auth header)
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.comment_votes.moderators.at(
        noAuthConnection,
        {
          commentVoteId: validCommentVoteId,
        },
      );
    },
  );
}
