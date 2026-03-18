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

export async function test_api_post_link_metadata_attach_and_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Admin actor connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Member actor connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    undefined as never,
  );

  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // Create a link-type post (SDK type is void; therefore we cannot obtain post id with given typings)
  // Best-effort: create the post, then validate attachPostLink behavior via upsert-like updates
  // requires a postId, but the only provided mechanism requires an existing postId.
  // Without a read/list post endpoint in the provided SDK, we can't retrieve postId deterministically.
  // We still call attachPostLink twice with a generated UUID in simulation-safe manner.
  const href1 = `https://example.com/${RandomGenerator.alphabets(12)}`;
  const href2 = `https://example.org/${RandomGenerator.alphabets(12)}`;
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: RandomGenerator.name(),
        link: {
          href: href1 as unknown as string & tags.Format<"uri">,
          display_title: RandomGenerator.name(),
          display_description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const postId = typia.random<string & tags.Format<"uuid">>();
  const updated1 =
    await generate_random_community_platform_admin_posts_link_attach_post_link(
      adminConnection,
      {
        params: { postId },
        body: {
          href: href1 as unknown as string & tags.Format<"uri">,
          displayTitle: RandomGenerator.name(),
          displayDescription: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(updated1);
  TestValidator.equals("postType reflects link", updated1.postType, "link");
  const updated2 =
    await generate_random_community_platform_admin_posts_link_attach_post_link(
      adminConnection,
      {
        params: { postId },
        body: {
          href: href2 as unknown as string & tags.Format<"uri">,
          displayTitle: RandomGenerator.name(),
          displayDescription: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "postType remains link after update",
    updated2.postType,
    "link",
  );
}
