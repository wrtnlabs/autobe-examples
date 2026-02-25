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

/**
 * Scenario 1: Moderator successfully casts an upvote on an existing comment vote entity.
 *
 * - Preconditions:
 *  1. Moderator account is created and logged in.
 *  2. A user comment vote entity exists to vote on.
 *
 * - Test steps:
 *  1. Moderator sends a POST request to the endpoint `/communityPlatform/moderator/commentVotes/moderators` with a valid commentVoteId and vote +1.
 *  2. Verify response status is 201 Created.
 *  3. Verify the returned vote record corresponds to the moderator, comment vote, and vote value +1.
 *  4. Verify the vote timestamps are set appropriately.
 *
 * - Business rules validated:
 *  * Only authenticated moderators can create votes.
 *  * Vote value must be +1 for upvote.
 *
 * - Expected results:
 *  * New moderator vote record created successfully and returned with accurate data.
 */
export async function test_api_moderator_comment_vote_moderator_create_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 0. Create a new connection for moderator join
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  // 1. Moderator account registration and authorization
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: `https://random.imagecdn.app/${RandomGenerator.alphabets(6)}.jpg`,
      },
    },
  );
  // 2. Create a new connection for authorized moderator
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: moderatorAuthorized.token.access },
  };
  // 3. Generate a user comment vote entity to vote on
  const userCommentVote = await generate_random_community_platform_comment_votes_create(
    moderatorConnection,
    {},
  );
  typia.assert(userCommentVote);
  // Typing note: userCommentVote might have id in nested property, assert with cast
  const userCommentVoteId: string = (userCommentVote as any).id ?? (userCommentVote as any).commentVote?.id;
  if (typeof userCommentVoteId !== "string") throw new Error("userCommentVote id not found");
  // 4. Moderator casts an upvote (+1) on the user comment vote
  const moderatorVoteBody: ICommunityPlatformCommentVoteOfModerator.ICreate = {
    commentVoteId: userCommentVoteId,
    vote: 1,
  };
  const moderatorVote = await generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
    moderatorConnection,
    { body: moderatorVoteBody },
  );
  typia.assert(moderatorVote);
  TestValidator.equals("vote value", moderatorVote.vote, 1);
  // commentVote.id accessing adjusted for type
  const moderatorVoteCommentVoteId: string = (moderatorVote.commentVote as any)?.id ?? "";
  if (!moderatorVoteCommentVoteId) throw new Error("moderatorVote.commentVote.id not found");
  TestValidator.equals("commentVoteId correlation", moderatorVoteCommentVoteId, userCommentVoteId);
  // Additional checks on timestamps - createdAt and updatedAt
  const createdAt = new Date(moderatorVote.createdAt);
  const updatedAt = new Date(moderatorVote.updatedAt);
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(createdAt.getTime()) && createdAt.getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    !isNaN(updatedAt.getTime()) && updatedAt.getTime() <= Date.now(),
  );
  // Check deletedAt is null
  TestValidator.equals("deletedAt is null", moderatorVote.deletedAt, null);
  // Check moderator id exists and is string
  const moderatorId: string = (moderatorVote.moderator as any)?.id ?? "";
  if (!moderatorId) throw new Error("moderatorVote.moderator.id not found");
  TestValidator.predicate("moderator id is not empty", typeof moderatorId === "string" && moderatorId.length > 0);
}
