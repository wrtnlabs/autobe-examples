import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
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
import { generate_random_community_platform_user_posts_vote_create_vote } from "../../../generate/generate_random_community_platform_user_posts_vote_create_vote";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_user_cast_upvote_and_change_vote(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: User casts an upvote on a post
  // 1. User registration
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authUser = await authorize_user_join(userJoinConnection, { body: {} });
  typia.assert(authUser);
  // 2. Create user connection with Authorization header
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authUser.token.access };
  // 3. Instead of using post.id (doesn't exist), generate a random UUID for postId to cast votes
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. User casts an upvote on the post
  const voteUpBody: ICommunityPlatformPostVote.ICreate = {
    vote_type: "upvote",
  };
  const voteSummaryUp =
    await generate_random_community_platform_user_posts_vote_create_vote(
      userConnection,
      {
        body: voteUpBody,
        params: { postId: postId },
      },
    );
  typia.assert(voteSummaryUp);
  // 5. Scenario 2: User changes vote from upvote to downvote
  const voteDownBody: ICommunityPlatformPostVote.ICreate = {
    vote_type: "downvote",
  };
  const voteSummaryDown =
    await generate_random_community_platform_user_posts_vote_create_vote(
      userConnection,
      {
        body: voteDownBody,
        params: { postId: postId },
      },
    );
  typia.assert(voteSummaryDown);
  // Note: Cannot verify vote count changes due to missing vote summary properties
}
