import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_creation_link_and_image_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // --- Link post test ---
  const linkPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: "Interesting Article",
          type: "link",
          url: "https://www.example.com/article/123",
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(linkPost);
  // Validate link post type
  TestValidator.equals("link post type", linkPost.type, "link");
  TestValidator.equals("link post voteScore", linkPost.voteScore, 0);
  TestValidator.equals("link post commentCount", linkPost.commentCount, 0);
  TestValidator.equals("link post deletedAt", linkPost.deletedAt, null);
  // Cast content to ILinkContent since post type is "link"
  const linkContent = linkPost.content as ICommunityPost.ILinkContent;
  TestValidator.equals(
    "link content url",
    linkContent.url,
    "https://www.example.com/article/123",
  );
  TestValidator.equals(
    "link content domain",
    linkContent.domain,
    "www.example.com",
  );
  // --- Image post test ---
  const imagePost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: "Cool Photo",
          type: "image",
          image_url: "https://cdn.example.com/photo.jpg",
          thumbnail_url: "https://cdn.example.com/photo_thumb.jpg",
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(imagePost);
  // Validate image post type
  TestValidator.equals("image post type", imagePost.type, "image");
  TestValidator.equals("image post voteScore", imagePost.voteScore, 0);
  TestValidator.equals("image post commentCount", imagePost.commentCount, 0);
  TestValidator.equals("image post deletedAt", imagePost.deletedAt, null);
  // Narrow content to IImageContent
  // IImageContent does not have a 'type' discriminator, so check via post type
  const imageContent = imagePost.content as ICommunityPost.IImageContent;
  TestValidator.equals(
    "image content imageUrl",
    imageContent.imageUrl,
    "https://cdn.example.com/photo.jpg",
  );
  TestValidator.equals(
    "image content thumbnailUrl",
    imageContent.thumbnailUrl,
    "https://cdn.example.com/photo_thumb.jpg",
  );
}