import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_retrieve_link_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // Step 4: Create a link-type post with a YouTube URL
  const linkUrl = "https://www.youtube.com/watch?v=abc123";
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "link",
        url: linkUrl,
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(post);
  // Step 5: Retrieve the post by its ID
  const retrieved = await api.functional.communityPlatform.member.posts.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrieved);
  // Step 6: Validate type discriminator and type-specific content
  TestValidator.equals("post type is link", retrieved.type, "link");
  TestValidator.equals(
    "link.url matches input URL",
    retrieved.link!.url,
    linkUrl,
  );
  TestValidator.equals(
    "link.domain_name is extracted correctly",
    retrieved.link!.domain_name,
    "youtube.com",
  );
  // Validate mutually exclusive type fields are absent
  TestValidator.equals(
    "text field is absent for link post",
    retrieved.text,
    undefined,
  );
  TestValidator.equals(
    "image field is absent for link post",
    retrieved.image,
    undefined,
  );
  // Validate base fields
  TestValidator.equals("vote_score starts at 0", retrieved.vote_score, 0);
  TestValidator.equals("comment_count starts at 0", retrieved.comment_count, 0);
  TestValidator.equals("post id is preserved", retrieved.id, post.id);
  TestValidator.equals("title is preserved", retrieved.title, post.title);
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.predicate(
    "link has created_at timestamp",
    typeof retrieved.link!.created_at === "string",
  );
  TestValidator.predicate(
    "link has updated_at timestamp",
    typeof retrieved.link!.updated_at === "string",
  );
}
