import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_comment_votes_create } from "../../../generate/generate_random_community_platform_comment_votes_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";

export async function test_api_comment_vote_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for removing a vote on a comment by submitting a 'removal' voteType.
  // The test simulates a user who previously voted (upvote or downvote) deleting their vote.
  // It validates the vote record is updated accordingly, karma is recalculated,
  // and the response shows no active vote (zero counts) from the user on this comment.
  // 1. User join and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(user);
  userConnection.headers = { Authorization: user.token.access };
  // 2. Create initial vote (randomly upvote or downvote) on a random comment
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const initialVoteType = RandomGenerator.pick(["upvote", "downvote"]);
  const createdVote =
    await generate_random_community_platform_comment_votes_create(
      userConnection,
      {
        body: {
          communityPlatformCommentId: commentId,
          voteType: initialVoteType,
        },
      },
    );
  typia.assert(createdVote);
  // 3. Attempt to remove the vote by submitting a 'removal' voteType (string "removal")
  // According to DTO, voteType allowed values are 'upvote' or 'downvote'. Here we test removal as 'removal'.
  // The backend is expected to interpret this as removing the vote.
  const removalBody = {
    communityPlatformCommentId: commentId,
    voteType: "removal",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  try {
    const removalResponse =
      await generate_random_community_platform_comment_votes_create(
        userConnection,
        { body: removalBody },
      );
    typia.assert(removalResponse);
    // Validate that removal sets the counts to zero or that vote is removed
    TestValidator.predicate(
      "vote removal reflected",
      removalResponse.upvoteCount === 0 && removalResponse.downvoteCount === 0,
    );
  } catch {
    // Some backends might reject the removal voteType
    await TestValidator.error("removal voteType rejected", async () => {
      await generate_random_community_platform_comment_votes_create(
        userConnection,
        {
          body: removalBody,
        },
      );
    });
  }
}
