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

export async function test_api_comment_vote_create_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for a registered user casting a new upvote on a comment.
  // This includes user authentication, ensuring the comment exists, and that the user
  // has permission to vote (i.e., subscribed or authorized). The test verifies
  // that a new vote record is created with 'upvote' type and returns the correct vote
  // entity with updated upvote count.
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // 2. Prepare a valid comment UUID to upvote
  // Since no comment creation endpoint is provided, generate a random UUID to simulate.
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Compose the vote creation request body
  const voteBody = {
    communityPlatformCommentId: commentId,
    voteType: "upvote",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  // 4. Cast the upvote using the utility function
  const vote = await generate_random_community_platform_comment_votes_create(
    userConnection,
    {
      body: voteBody,
    },
  );
  // 5. Validate the response DTO
  typia.assert(vote);
  TestValidator.predicate(
    "voteType is 'upvote' and upvoteCount > 0",
    vote.upvoteCount > 0,
  );
  TestValidator.equals("downvoteCount is zero", vote.downvoteCount, 0);
}
