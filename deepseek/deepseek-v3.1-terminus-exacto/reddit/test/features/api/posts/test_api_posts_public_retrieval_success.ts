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

export async function test_api_posts_public_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user account
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create text post in the community
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Retrieve the post details
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    userConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // Validate post details
  TestValidator.equals("post ID matches", retrievedPost.id, post.id);
  TestValidator.equals("post title matches", retrievedPost.title, post.title);
  TestValidator.equals("post type is text", retrievedPost.post_type, "text");
  // Validate author information
  TestValidator.equals(
    "author ID matches",
    retrievedPost.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    authorizedUser.username,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedPost.author.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals(
    "author karma matches",
    retrievedPost.author.karma,
    authorizedUser.karma,
  );
  TestValidator.equals(
    "author avatar URL matches",
    retrievedPost.author.avatar_url,
    authorizedUser.avatar_url,
  );
  // Validate community information
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedPost.community.description,
    community.description,
  );
  TestValidator.equals(
    "community icon URL matches",
    retrievedPost.community.icon_url,
    community.icon_url,
  );
  // Validate engagement metrics
  TestValidator.predicate(
    "votes count is non-negative",
    retrievedPost.votes_count >= 0,
  );
  TestValidator.predicate(
    "comments count is non-negative",
    retrievedPost.comments_count >= 0,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      retrievedPost.created_at,
    ),
  );
  TestValidator.predicate(
    "updated at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      retrievedPost.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted at is null for active post",
    retrievedPost.deleted_at,
    null,
  );
}
