import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
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
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { generate_random_community_platform_user_comments_votes_create_comment_vote } from "../../../generate/generate_random_community_platform_user_comments_votes_create_comment_vote";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote_of_users } from "../../../prepare/prepare_random_community_platform_comment_vote_of_users";

export async function test_api_comment_vote_create_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario:
   * 1. User joins the platform and authenticates (gets a valid token).
   * 2. Because ICommunityPlatformComment has no accessible ID, we simulate a valid UUID.
   * 3. Cast an initial upvote vote on the comment (with random UUID).
   * 4. Assert the vote response is valid.
   * 5. Cannot validate vote score or karma due to missing DTO properties.
   */
  // 1. User registration and authorization
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userJoinConnection, { body: {} });
  typia.assert(userAuth);
  // Prepare user connection with authorization header
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Generate a random UUID for commentId (because no id in ICommunityPlatformComment)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create upvote vote body
  const voteBody: ICommunityPlatformCommentVoteOfUsers.ICreate = {
    vote_type: "upvote",
  };
  typia.assert(voteBody);
  // 4. Call vote create API
  const vote =
    await generate_random_community_platform_user_comments_votes_create_comment_vote(
      userConnection,
      {
        body: voteBody,
        params: { commentId },
      },
    );
  typia.assert(vote);
  // 5. Assert that the vote response is valid (cannot assert vote_type as it does not exist on response)
}
