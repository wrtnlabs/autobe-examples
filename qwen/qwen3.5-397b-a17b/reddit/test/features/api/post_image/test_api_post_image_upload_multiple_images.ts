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

export async function test_api_post_image_upload_multiple_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
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
  // 4. Create image post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        image_path: typia.random<string>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Upload multiple images sequentially
  const imageCount = 3;
  const uploadedImages: IRedditCommunityPostImage[] = [];
  for (let i = 0; i < imageCount; i++) {
    const image =
      await generate_random_reddit_community_member_posts_images_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            filePath: typia.random<string>(),
            fileSize: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            mimeType: RandomGenerator.pick([
              "image/jpeg",
              "image/png",
              "image/gif",
            ] as const),
            width: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            height: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          },
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // 6. Validate sort_order is sequential (0, 1, 2)
  TestValidator.equals(
    "first image sort_order",
    uploadedImages[0].sort_order,
    0,
  );
  TestValidator.equals(
    "second image sort_order",
    uploadedImages[1].sort_order,
    1,
  );
  TestValidator.equals(
    "third image sort_order",
    uploadedImages[2].sort_order,
    2,
  );
  // 7. Validate all images are associated with the correct post
  for (let i = 0; i < imageCount; i++) {
    TestValidator.equals(
      `image ${i} post ID`,
      uploadedImages[i].post.id,
      post.id,
    );
  }
  // 8. Validate sort_order increases with each upload
  for (let i = 1; i < imageCount; i++) {
    TestValidator.predicate(
      `sort_order increases from ${i - 1} to ${i}`,
      uploadedImages[i].sort_order === uploadedImages[i - 1].sort_order + 1,
    );
  }
}
