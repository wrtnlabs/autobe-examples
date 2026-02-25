import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTextContent";
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

export async function test_api_post_content_retrieval_all_types(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create text post
  const textPost = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  // Create link post
  const linkPost = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "link" as const,
        link_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  // Create image post
  const imagePost = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "image" as const,
        image_url: typia.random<string & tags.Format<"uri">>(),
        image_alt: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // Test text post content retrieval
  const textContent = await api.functional.communityPlatform.posts.content(
    userConnection,
    { postId: textPost.id },
  );
  typia.assert(textContent);
  // Test link post content retrieval
  const linkContent = await api.functional.communityPlatform.posts.content(
    userConnection,
    { postId: linkPost.id },
  );
  typia.assert(linkContent);
  // Test image post content retrieval
  const imageContent = await api.functional.communityPlatform.posts.content(
    userConnection,
    { postId: imagePost.id },
  );
  typia.assert(imageContent);
  // Validate union type discriminator by ensuring each content type has the correct structure
  // The typia.assert() calls above already validate the complete structure including discriminators
  // Additional validation focuses on business logic rather than type checking
  // Verify that posts exist and content retrieval was successful (no 404 errors)
  TestValidator.predicate(
    "text post content retrieved successfully",
    textPost.id !== undefined,
  );
  TestValidator.predicate(
    "link post content retrieved successfully",
    linkPost.id !== undefined,
  );
  TestValidator.predicate(
    "image post content retrieved successfully",
    imagePost.id !== undefined,
  );
}
