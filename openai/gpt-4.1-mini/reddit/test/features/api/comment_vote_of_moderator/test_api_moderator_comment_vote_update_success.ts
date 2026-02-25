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

export async function test_api_moderator_comment_vote_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  // Update moderatorConnection with authorization token
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create a comment vote entity
  const commentVoteRaw =
    await generate_random_community_platform_comment_votes_create(
      moderatorConnection,
      {
        body: {},
      },
    );
  const commentVote = typia.assert<IEntity & ICommunityPlatformCommentVote>(commentVoteRaw);
  // 3. Create the moderator's comment vote record with a vote of -1 or +1
  const initialVoteValue: -1 | 1 = RandomGenerator.pick([-1, 1]);
  const modCommentVote =
    await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
      moderatorConnection,
      {
        body: {
          commentVoteId: commentVote.id,
          vote: initialVoteValue,
        },
      },
    );
  typia.assert(modCommentVote);
  // 4. Update the moderator's vote to +1 (upvote)
  // If initialVoteValue is already +1, this tests idempotency
  const updateBody: ICommunityPlatformCommentVoteOfModerator.IUpdate = {
    vote: 1,
  };
  const updatedVote =
    await api.functional.communityPlatform.moderator.commentVotes.moderators.update(
      moderatorConnection,
      {
        commentVoteId: modCommentVote.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVote);
  // 5. Assertions to confirm update
  TestValidator.equals("vote should be updated to +1", updatedVote.vote, 1);
  TestValidator.equals(
    "commentVoteId should remain the same",
    updatedVote.commentVote.id,
    commentVote.id,
  );
  TestValidator.predicate(
    "updatedAt should be later or the same as createdAt",
    new Date(updatedVote.updatedAt) >= new Date(updatedVote.createdAt),
  );
  TestValidator.predicate(
    "vote record is active (not soft deleted)",
    updatedVote.deletedAt === null,
  );
  // 6. Test changing vote from +1 to -1
  const updateBody2: ICommunityPlatformCommentVoteOfModerator.IUpdate = {
    vote: -1,
  };
  const changedVote =
    await api.functional.communityPlatform.moderator.commentVotes.moderators.update(
      moderatorConnection,
      {
        commentVoteId: modCommentVote.id,
        body: updateBody2,
      },
    );
  typia.assert(changedVote);
  TestValidator.equals("vote should be updated to -1", changedVote.vote, -1);
  TestValidator.predicate(
    "updatedAt should be later or the same than previous updatedAt",
    new Date(changedVote.updatedAt) >= new Date(updatedVote.updatedAt),
  );
  TestValidator.predicate(
    "vote record is active (not soft deleted) after change",
    changedVote.deletedAt === null,
  );
}
