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

export async function test_api_moderator_comment_vote_moderator_update_vote(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Moderator updates an existing vote from upvote to downvote on a comment vote entity.
  // 1. Moderator account is created and logged in.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody: ICommunityPlatformModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: null,
    bio: null,
    avatarUrl: null,
  };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 2. A comment vote entity exists.
  const commentVoteRaw =
    await generate_random_community_platform_comment_votes_create(
      moderatorConnection,
      {},
    );
  // Cast commentVoteRaw to ICommunityPlatformCommentVoteOfModerator with id
  const commentVote = typia.assert<ICommunityPlatformCommentVoteOfModerator>(commentVoteRaw);
  // 3. Moderator has already cast an upvote on the comment vote.
  const upvote =
    await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
      moderatorConnection,
      {
        body: {
          commentVoteId: commentVote.id,
          vote: 1,
        },
      },
    );
  typia.assert(upvote);
  TestValidator.equals("Initial vote is upvote", upvote.vote, 1);
  // 4. Moderator sends a POST request to cast a vote with value -1 on the same commentVoteId.
  const updatedVote =
    await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
      moderatorConnection,
      {
        body: {
          commentVoteId: commentVote.id,
          vote: -1,
        },
      },
    );
  typia.assert(updatedVote);
  // 5. Verify the vote record is updated with the new vote value -1.
  TestValidator.equals("Updated vote is downvote", updatedVote.vote, -1);
  // 6. Verify historical consistency and audit timestamps.
  TestValidator.predicate(
    "createdAt is before or equal to updatedAt",
    new Date(updatedVote.createdAt).getTime() <=
      new Date(updatedVote.updatedAt).getTime(),
  );
  TestValidator.predicate("deletedAt is null", updatedVote.deletedAt === null);
  // 7. Verify only authorized moderators can vote - unauthorized vote attempt.
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized moderator comment vote attempt",
    async () => {
      await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
        unauthorizedConnection,
        {
          body: {
            commentVoteId: commentVote.id,
            vote: 1,
          },
        },
      );
    },
  );
}
