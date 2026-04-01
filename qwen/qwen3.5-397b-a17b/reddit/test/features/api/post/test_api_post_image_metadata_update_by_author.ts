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

export async function test_api_post_image_metadata_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
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
      {},
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
        image_path: RandomGenerator.alphabets(10),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Attach image to post
  const image =
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
        } satisfies IRedditCommunityPostImage.ICreate,
      },
    );
  typia.assert(image);
  // Store original updated_at for comparison
  const originalUpdatedAt = image.updated_at;
  // 6. Update image metadata
  const updateBody = {
    sort_order: typia.random<number & tags.Type<"int32">>(),
    mime_type: "image/png",
    width: typia.random<number & tags.Type<"int32">>(),
    height: typia.random<number & tags.Type<"int32">>(),
  } satisfies IRedditCommunityPostImage.IUpdate;
  const updatedImage =
    await api.functional.redditCommunity.member.posts.images.putByPostidAndImageid(
      memberConnection,
      {
        postId: post.id,
        imageId: image.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 7. Validate the update
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updatedImage.updated_at,
  );
  TestValidator.equals(
    "mime_type updated",
    updatedImage.mime_type,
    updateBody.mime_type,
  );
  TestValidator.equals("width updated", updatedImage.width, updateBody.width);
  TestValidator.equals(
    "height updated",
    updatedImage.height,
    updateBody.height,
  );
  TestValidator.equals(
    "sort_order updated",
    updatedImage.sort_order,
    updateBody.sort_order,
  );
  TestValidator.equals("post relation correct", updatedImage.post.id, post.id);
}