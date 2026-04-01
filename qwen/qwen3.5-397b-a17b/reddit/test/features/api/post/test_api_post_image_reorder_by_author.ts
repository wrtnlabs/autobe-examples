import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_images_create } from "../../../generate/generate_random_reddit_community_member_posts_images_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_image } from "../../../prepare/prepare_random_reddit_community_post_image";

export async function test_api_post_image_reorder_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create image post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        image_path: typia.random<string>(),
      },
    },
  );
  typia.assert(post);
  TestValidator.equals("post type", post.post_type, "image");
  // 5. Upload 3 images to the post (sort_order 0, 1, 2)
  const image1 =
    await generate_random_reddit_community_member_posts_images_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          filePath: typia.random<string>(),
          fileSize: typia.random<number & tags.Type<"int32">>(),
          mimeType: "image/jpeg",
          width: typia.random<number & tags.Type<"int32">>(),
          height: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_reddit_community_member_posts_images_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          filePath: typia.random<string>(),
          fileSize: typia.random<number & tags.Type<"int32">>(),
          mimeType: "image/png",
          width: typia.random<number & tags.Type<"int32">>(),
          height: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_reddit_community_member_posts_images_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          filePath: typia.random<string>(),
          fileSize: typia.random<number & tags.Type<"int32">>(),
          mimeType: "image/gif",
          width: typia.random<number & tags.Type<"int32">>(),
          height: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(image3);
  // Verify initial sort_order values are sequential
  TestValidator.predicate("image1 sort_order is 0", image1.sort_order === 0);
  TestValidator.predicate("image2 sort_order is 1", image2.sort_order === 1);
  TestValidator.predicate("image3 sort_order is 2", image3.sort_order === 2);
  // 6. Reorder images by reversing sort_order (0->2, 1->1, 2->0)
  // Update image1 from sort_order 0 to 2
  const reorderedPost =
    await api.functional.redditCommunity.member.posts.images.patchByPostid(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort_order: 2,
        },
      },
    );
  typia.assert(reorderedPost);
  // 7. Validate reordered images
  TestValidator.equals("post id matches", reorderedPost.id, post.id);
  TestValidator.predicate("has 3 images", reorderedPost.images.length === 3);
  // Verify all images belong to the post
  for (const image of reorderedPost.images) {
    TestValidator.equals("image post id", image.post.id, post.id);
    TestValidator.predicate(
      "sort_order is non-negative",
      image.sort_order >= 0,
    );
  }
  // Verify no duplicate sort_order values
  const sortOrders = reorderedPost.images.map((img) => img.sort_order);
  const uniqueSortOrders = new Set(sortOrders);
  TestValidator.equals(
    "no duplicate sort_order",
    sortOrders.length,
    uniqueSortOrders.size,
  );
}
