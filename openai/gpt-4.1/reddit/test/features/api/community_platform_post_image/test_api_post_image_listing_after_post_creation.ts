import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";

/**
 * Validate listing of images attached to a community post.
 *
 * 1. Register a new member.
 * 2. Create a community as that member.
 * 3. Create a post in the new community.
 * 4. Query the /images endpoint for that post. It should return an empty array
 *    initially.
 * 5. Simulate attaching images to the post (since no explicit attach API is
 *    available -- this process may be a placeholder).
 * 6. Query the /images endpoint again. It should return an array of attached image
 *    metadata.
 * 7. Attempt to query images for a non-existent post, and expect an error.
 * 8. (If possible) Attempt to query images for posts a member shouldn’t access
 *    (e.g., from a restricted/deleted post/community).
 */
export async function test_api_post_image_listing_after_post_creation(
  connection: api.IConnection,
) {
  // 1. Member registration
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);

  // 2. Create a community as the registered member
  const communityReq = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityReq,
      },
    );
  typia.assert(community);

  // 3. Create a post in the new community
  const postReq = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_type: "text",
    content_body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postReq,
    },
  );
  typia.assert(post);

  // 4. Check that images API initially returns empty
  const resp0 = await api.functional.communityPlatform.posts.images.index(
    connection,
    {
      postId: post.id,
      body: {
        postId: post.id,
      },
    },
  );
  typia.assert(resp0);
  TestValidator.equals("image list empty after creation", resp0.data.length, 0);

  // 5. Simulate attaching images: skip, as there's no image attach API for a post in the DTO/API
  // 6. Query again expecting same result (remains empty, as images cannot be attached in this test)
  const resp1 = await api.functional.communityPlatform.posts.images.index(
    connection,
    {
      postId: post.id,
      body: {
        postId: post.id,
      },
    },
  );
  typia.assert(resp1);
  TestValidator.equals(
    "image list still empty (no images attached API)",
    resp1.data.length,
    0,
  );

  // 7. Query images for non-existent post and expect error
  await TestValidator.error(
    "listing images for non-existent post should fail",
    async () => {
      await api.functional.communityPlatform.posts.images.index(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      });
    },
  );
}
