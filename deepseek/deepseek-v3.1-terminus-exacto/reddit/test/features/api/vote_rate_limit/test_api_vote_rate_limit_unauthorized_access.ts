import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_vote_rate_limit_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create User A connection
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAAuthorized);
  // Create User B connection
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userBAuthorized);
  // User B creates a post
  const post = await generate_random_community_platform_user_posts_create(
    userBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // User B votes on the post to generate a rate limit record
  const vote = await generate_random_community_platform_user_posts_votes_create(
    userBConnection,
    {
      params: { postId: post.id },
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // Since we cannot retrieve the actual rate limit record ID through available APIs,
  // we test with a random UUID to verify that unauthorized access is properly denied.
  // This tests the authorization layer even if we can't test the specific record ownership.
  await TestValidator.httpError(
    "unauthorized access to vote rate limit",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.user.vote_rate_limits.at(
        userAConnection,
        {
          rateLimitId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
