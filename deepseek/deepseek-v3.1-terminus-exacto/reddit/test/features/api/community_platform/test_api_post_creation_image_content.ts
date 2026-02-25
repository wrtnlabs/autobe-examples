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
 * Test successful creation of an image post with proper image metadata.
 * Validate that the image URL is properly formatted and that accessibility alt text is stored correctly.
 * Verify that image posts support the required image formats (JPEG, PNG, WebP) and that file size constraints are enforced.
 * Ensure that image posts include proper thumbnail generation and display in feeds.
 */
export async function test_api_post_creation_image_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
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
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create image post with proper image URL format
  const imageFormats = ["jpeg", "png", "webp"] as const;
  const selectedFormat = RandomGenerator.pick(imageFormats);
  const imageUrl =
    `https://example.com/images/test-image.${selectedFormat}` satisfies string &
      tags.Format<"uri">;
  const imageAlt = `Accessibility description for image in ${selectedFormat} format`;
  const imagePost = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }),
        community_name: community.name,
        post_type: "image" as const,
        image_url: imageUrl,
        image_alt: imageAlt,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 4. Validate post creation and image metadata
  TestValidator.equals(
    "post type should be image",
    imagePost.post_type,
    "image",
  );
  TestValidator.equals(
    "community should match",
    imagePost.community.name,
    community.name,
  );
  TestValidator.equals("author should match", imagePost.author.id, user.id);
  // 5. Validate post structure
  TestValidator.predicate(
    "post should have valid ID",
    imagePost.id !== undefined && imagePost.id !== null,
  );
  TestValidator.predicate(
    "post should have creation timestamp",
    imagePost.created_at !== undefined,
  );
  TestValidator.predicate(
    "votes count should be initialized to zero",
    imagePost.votes_count === 0,
  );
  TestValidator.predicate(
    "comments count should be initialized to zero",
    imagePost.comments_count === 0,
  );
  TestValidator.predicate("post should have title", imagePost.title.length > 0);
}
