import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";

/**
 * Test retrieving all image metadata for a post as the authenticated user who
 * created the post. This scenario covers creating a new user, registering a
 * community, creating a post within the community, uploading multiple images to
 * the post, and then using this endpoint to fetch all associated images.
 * Validates correct access, that returned images correspond only to the target
 * post, and response structure matches image metadata requirements.
 */
export async function test_api_post_images_listing_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const userJoin = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://community-app.io/register",
    referrer: "https://community-app.io/",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoin });
  typia.assert(user);

  // 2. Create a new community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a post with multiple images in the community
  const allowedTypes = ["jpeg", "png", "gif"] as const;
  const images = ArrayUtil.repeat(3, () => {
    const type = RandomGenerator.pick(allowedTypes);
    return {
      uri: typia.random<string & tags.Format<"uri">>(),
      file_type: type,
      file_size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
      >() satisfies number as number,
    };
  });
  const postCreate = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    image_files: images,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);
  TestValidator.equals(
    "images attached in post",
    post.image_contents.length,
    images.length,
  );

  // 4. Retrieve post images via images.index endpoint
  const req = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformPostImage.IRequest;
  const resp: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.user.posts.images.index(connection, {
      postId: post.id,
      body: req,
    });
  typia.assert(resp);

  // Validate that data matches images uploaded
  TestValidator.equals("image count matches", resp.data.length, images.length);
  for (const img of images) {
    const found = resp.data.find((x) => x.uri === img.uri);
    TestValidator.predicate(`image with uri ${img.uri} returned`, !!found);
    if (found) {
      TestValidator.equals(
        `file_type matches for ${img.uri}`,
        found.file_type,
        img.file_type,
      );
      TestValidator.equals(
        `file_size_bytes matches for ${img.uri}`,
        found.file_size_bytes,
        img.file_size_bytes,
      );
      TestValidator.equals(
        `community_platform_post_id matches for ${img.uri}`,
        found.community_platform_post_id,
        post.id,
      );
    }
  }

  // 5. Error scenario: simulate soft-deleting post (simulate with wrong postId)
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "access denied if post does not exist",
    async () => {
      await api.functional.communityPlatform.user.posts.images.index(
        connection,
        {
          postId: fakePostId,
          body: req,
        },
      );
    },
  );
}
