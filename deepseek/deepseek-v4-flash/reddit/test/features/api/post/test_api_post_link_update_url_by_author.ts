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

export async function test_api_post_link_update_url_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe member to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 4. Create a link-type post with initial URL
  const initialUrl = "https://www.example.com";
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "link" as const,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        url: initialUrl,
      },
    },
  );
  typia.assert(post);
  TestValidator.equals("post type is link", post.type, "link");
  TestValidator.equals("initial url matches", post.link?.url, initialUrl);
  TestValidator.predicate(
    "domain_name is extracted",
    post.link?.domain_name === "www.example.com",
  );
  // 5. Update the link post's URL to a new URL
  const newUrl = "https://www.youtube.com/watch?v=abc123";
  const updated = await api.functional.communityPlatform.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        url: newUrl,
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(updated);
  // 6. Validate the update
  TestValidator.equals("type remains link", updated.type, "link");
  TestValidator.equals("url is updated", updated.link?.url, newUrl);
  TestValidator.predicate(
    "domain_name is re-extracted",
    updated.link?.domain_name === "youtube.com",
  );
  TestValidator.equals(
    "vote_score unchanged",
    updated.vote_score,
    post.vote_score,
  );
  TestValidator.equals(
    "comment_count unchanged",
    updated.comment_count,
    post.comment_count,
  );
  TestValidator.predicate(
    "updated_at is set after edit",
    updated.updated_at !== null,
  );
}
