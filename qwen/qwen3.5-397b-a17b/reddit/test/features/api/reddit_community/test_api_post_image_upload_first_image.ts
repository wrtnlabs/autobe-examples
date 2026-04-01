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

export async function test_api_post_image_upload_first_image(
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
  // 2. Create a community
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
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create an image post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        image_path: "/images/test-image.jpg",
      },
    },
  );
  typia.assert(post);
  // 5. Upload the first image to the post
  const image =
    await generate_random_reddit_community_member_posts_images_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          filePath: "/storage/posts/images/test-image-001.jpg",
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000000>
          >(),
          mimeType: "image/jpeg",
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
        },
      },
    );
  typia.assert(image);
  // 6. Validate image metadata
  TestValidator.equals(
    "image file_path matches",
    image.file_path,
    "/storage/posts/images/test-image-001.jpg",
  );
  TestValidator.predicate("file_size is positive", image.file_size > 0);
  TestValidator.equals("mime_type is correct", image.mime_type, "image/jpeg");
  TestValidator.predicate("width is positive", image.width > 0);
  TestValidator.predicate("height is positive", image.height > 0);
  TestValidator.equals("sort_order is 0 for first image", image.sort_order, 0);
  TestValidator.equals("image post_id matches", image.post.id, post.id);
  TestValidator.predicate("created_at is valid", image.created_at !== null);
  TestValidator.predicate("updated_at is valid", image.updated_at !== null);
  TestValidator.equals(
    "deleted_at is null for active image",
    image.deleted_at,
    null,
  );
}
