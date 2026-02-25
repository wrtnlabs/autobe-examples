import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test unauthenticated user accessing public post from community that participates in public feed.
 * Create authenticated user to create community and post, then attempt retrieval without authentication.
 * Validate that post details are accessible to anonymous users, including basic post information,
 * community details, and engagement metrics.
 */
export async function test_api_posts_anonymous_access_public_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post in the community
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Use base connection (without authentication) to access the post
  const anonymousPost = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(anonymousPost);
  // 5. Validate that post details are properly accessible to anonymous users
  TestValidator.equals("post ID matches", anonymousPost.id, post.id);
  TestValidator.equals("post title matches", anonymousPost.title, post.title);
  TestValidator.equals(
    "post type matches",
    anonymousPost.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "community ID matches",
    anonymousPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    anonymousPost.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    anonymousPost.community.description,
    community.description,
  );
  TestValidator.equals("author ID matches", anonymousPost.author.id, user.id);
  TestValidator.equals(
    "author username matches",
    anonymousPost.author.username,
    user.username,
  );
  TestValidator.predicate(
    "has valid vote count",
    anonymousPost.votes_count >= 0,
  );
  TestValidator.predicate(
    "has valid comment count",
    anonymousPost.comments_count >= 0,
  );
  TestValidator.predicate(
    "has valid creation date",
    new Date(anonymousPost.created_at) <= new Date(),
  );
}
