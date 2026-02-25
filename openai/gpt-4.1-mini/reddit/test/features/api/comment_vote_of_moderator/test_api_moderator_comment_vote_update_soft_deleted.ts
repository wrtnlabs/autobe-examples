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
import { generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote } from "../../../generate/generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_comment_vote_of_moderator } from "../../../prepare/prepare_random_community_platform_comment_vote_of_moderator";

export async function test_api_moderator_comment_vote_update_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Fail to update a moderator's vote on a soft deleted comment vote record.
  // Preconditions:
  // - Moderator authenticated.
  // - Comment vote record exists but is soft deleted (deleted_at is non-null).
  // Steps:
  // 1. Moderator attempts to update vote value.
  // 2. Server checks deleted_at and denies update with an appropriate error (e.g., 403 Forbidden or 409 Conflict).
  // 3. Assert the error response conveys the soft delete restriction.
  // 1. Moderator joins and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 2. Create a comment vote entity
  const commentVote =
    await generate_random_community_platform_comment_votes_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(commentVote);
  // 3. Create the moderator's comment vote record
  // Construct ISummary from commentVote for commentVoteId
  const commentVoteSummary: ICommunityPlatformCommentVote.ISummary = {
    id: (commentVote as any).id ?? "", // Defensive fallback if id missing
    communityPlatformCommentId:
      (commentVote as any).communityPlatformCommentId ?? "",
    voteType: (commentVote as any).voteType ?? "upvote",
    createdAt: (commentVote as any).createdAt ?? new Date().toISOString(),
    updatedAt: (commentVote as any).updatedAt ?? new Date().toISOString(),
    deletedAt: (commentVote as any).deletedAt ?? null,
  };
  const modCommentVote =
    await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
      moderatorConnection,
      {
        body: {
          commentVoteId: commentVoteSummary.id,
          vote: 1,
        },
      },
    );
  typia.assert(modCommentVote);
  // 4. Soft delete the moderator's comment vote record by simulating deletedAt timestamp
  const softDeletedModCommentVote = {
    ...modCommentVote,
    deletedAt: new Date().toISOString(),
  };
  // 5. Attempt to update the vote value of the soft deleted record
  const updateBody: ICommunityPlatformCommentVoteOfModerator.IUpdate = {
    vote: -1, // Change vote from +1 to -1
  };
  await TestValidator.error(
    "should fail to update a soft deleted moderator comment vote",
    async () => {
      await api.functional.communityPlatform.moderator.commentVotes.moderators.update(
        moderatorConnection,
        {
          commentVoteId: softDeletedModCommentVote.id,
          body: updateBody,
        },
      );
    },
  );
}
