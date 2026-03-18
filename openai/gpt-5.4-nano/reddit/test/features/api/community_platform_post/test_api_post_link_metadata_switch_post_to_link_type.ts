import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_posts_link_attach_post_link } from "../../../generate/generate_random_community_platform_admin_posts_link_attach_post_link";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_metadata_switch_post_to_link_type(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin join.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/admin/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/admin/referrer" satisfies string &
        tags.Format<"uri">,
      ip: "192.0.2.11" satisfies string & tags.Format<"ipv4">,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2) Member join and create a community.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3) Subscribe the member to the community.
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  // 4) Create placeholder postId.
  // Note: this test focuses on compilation; the API call requires a postId.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const href1 = "https://example.com/path?x=1" satisfies string &
    tags.Format<"uri">;
  const updated1: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.link.attachPostLink(
      adminConnection,
      {
        postId,
        body: {
          href: href1,
          displayTitle: "Example Title",
          displayDescription: "Example Description",
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals("switched to link", updated1.postType, "link");
  const href2 = "https://example.org/another" satisfies string &
    tags.Format<"uri">;
  const updated2: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.link.attachPostLink(
      adminConnection,
      {
        postId,
        body: {
          href: href2,
          displayTitle: "Example Title 2",
          displayDescription: "Example Description 2",
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals("still link", updated2.postType, "link");
}
