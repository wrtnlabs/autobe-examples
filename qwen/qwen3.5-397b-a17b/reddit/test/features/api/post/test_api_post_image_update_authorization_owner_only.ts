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

export async function test_api_post_image_update_authorization_owner_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (post owner) authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. First member creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. First member subscribes to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      ownerConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. First member creates an image post
  const post = await api.functional.redditCommunity.member.posts.create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        image_path: RandomGenerator.alphabets(20),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. First member uploads images to the post
  const image =
    await generate_random_reddit_community_member_posts_images_create(
      ownerConnection,
      {
        params: { postId: post.id },
        body: {
          filePath: RandomGenerator.alphabets(30),
          fileSize: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          mimeType: "image/jpeg",
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(image);
  // 6. Second member (different user) authenticates
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(nonOwnerAuth);
  // 7. Second member attempts to update the first member's post images (should fail)
  await TestValidator.error("non-owner cannot update post images", async () => {
    await api.functional.redditCommunity.member.posts.images.patchByPostid(
      nonOwnerConnection,
      {
        postId: post.id,
        body: {
          sort_order: 1,
        } satisfies IRedditCommunityPostImage.IUpdate,
      },
    );
  });
  // 8. Verify owner can still update their own post images (sanity check)
  const updatedPost =
    await api.functional.redditCommunity.member.posts.images.patchByPostid(
      ownerConnection,
      {
        postId: post.id,
        body: {
          sort_order: 2,
        } satisfies IRedditCommunityPostImage.IUpdate,
      },
    );
  typia.assert(updatedPost);
  TestValidator.equals(
    "owner can update own post images",
    updatedPost.id,
    post.id,
  );
}
