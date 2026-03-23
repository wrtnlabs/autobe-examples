import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostImage";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test successful retrieval of images from an image-type post.
 *
 * This test validates the complete workflow of:
 * 1. Member authentication
 * 2. Community creation
 * 3. Image-type post creation
 * 4. Post image retrieval with pagination
 * 5. Response structure and content validation
 */
export async function test_api_post_image_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create an image-type post
  const postBody = {
    title: "Test Image Post",
    postType: "image",
    communityId: community.id,
    content: null,
  } satisfies IRedditClonePost.ICreate;
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: postBody },
  );
  typia.assert(post);
  // 4. Retrieve images from the post
  const imagesBody = {
    page: 1,
    pageSize: 20,
  } satisfies IRedditClonePostImage.IRequest;
  const imagesResponse = await api.functional.redditClone.posts.images.index(
    memberConnection,
    {
      postId: post.id,
      body: imagesBody,
    },
  );
  typia.assert(imagesResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    imagesResponse.pagination.current,
    1,
  );
  TestValidator.equals("page limit is 20", imagesResponse.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    imagesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    imagesResponse.pagination.pages >= 0,
  );
  // 6. Validate images array
  TestValidator.predicate(
    "images array exists",
    Array.isArray(imagesResponse.data),
  );
  // 7. Validate each image summary - deleted_at should be null for active images
  await ArrayUtil.asyncForEach(imagesResponse.data, async (image, index) => {
    typia.assert(image);
    // Validate deleted_at is null for active images
    TestValidator.equals(
      `image ${index} deleted_at is null for active image`,
      image.deleted_at,
      null,
    );
    // Validate sequence is positive
    TestValidator.predicate(
      `image ${index} has positive sequence`,
      image.sequence >= 1,
    );
  });
  // 8. Validate images are sorted by sequence ascending
  if (imagesResponse.data.length > 1) {
    TestValidator.predicate(
      "images are sorted by sequence ascending",
      (() => {
        for (let i = 1; i < imagesResponse.data.length; i++) {
          if (
            imagesResponse.data[i].sequence <=
            imagesResponse.data[i - 1].sequence
          ) {
            return false;
          }
        }
        return true;
      })(),
    );
  }
}
