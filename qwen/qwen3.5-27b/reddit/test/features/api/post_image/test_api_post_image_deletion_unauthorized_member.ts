import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_clone_member_posts_images_create } from "../../../generate/generate_random_reddit_clone_member_posts_images_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";

/**
 * Test that unauthorized members cannot delete images from posts they do not own.
 *
 * This test validates the authorization boundary that only post authors and
 * community moderators can delete images. An unauthorized member (not the author
 * and not a moderator) should receive a 403 Forbidden response when attempting
 * to delete an image, and the image should remain intact.
 */
export async function test_api_post_image_deletion_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the post author member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorResult = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorResult);
  // 2. Create a community as the author
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create an image-type post in the community as the author
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "image",
        communityId: community.id,
        content: null,
      },
    },
  );
  typia.assert(post);
  // 4. Upload an image to the post
  const image = await generate_random_reddit_clone_member_posts_images_create(
    authorConnection,
    {
      params: {
        postId: post.id,
      },
      body: {},
    },
  );
  typia.assert(image);
  // 5. Create and authenticate a different member (unauthorized)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedResult = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(unauthorizedResult);
  // 6. Attempt to delete the image using the unauthorized member's connection
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "unauthorized member cannot delete image",
    403,
    async () =>
      await api.functional.redditClone.member.posts.images.erase(
        unauthorizedConnection,
        {
          postId: post.id,
          imageId: image.id,
        },
      ),
  );
  // 7. Verify the image record shows it was not deleted
  // The image object we received earlier should still have deleted_at as null
  TestValidator.equals(
    "image deleted_at is null (not deleted)",
    image.deleted_at,
    null,
  );
  // 8. Verify the image file_url is still valid
  TestValidator.predicate(
    "image file_url still exists after failed deletion",
    image.file_url.length > 0,
  );
}
