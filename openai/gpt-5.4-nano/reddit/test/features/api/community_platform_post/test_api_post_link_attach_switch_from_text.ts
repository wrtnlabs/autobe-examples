import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_link_attach_post_link } from "../../../generate/generate_random_community_platform_member_posts_link_attach_post_link";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_attach_switch_from_text(
  connection: api.IConnection,
): Promise<void> {
  // Actor connections
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member (join)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // Create community (utility expects { body?: ... })
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: prepare_random_community_platform_community(),
    },
  );
  typia.assert(community);
  // Subscribe member
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  // Create a text post first (utility returns void)
  const textTitle = RandomGenerator.name();
  const textBody = RandomGenerator.paragraph({ sentences: 2 });
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: textTitle,
        body_text: textBody,
      },
    },
  );
  // Attach link metadata to the text post
  const canonicalHref = typia.random<string & tags.Format<"uri">>();
  const displayTitle = RandomGenerator.name();
  const displayDescription = RandomGenerator.paragraph({ sentences: 2 });
  const createdPostId = typia.random<string & tags.Format<"uuid">>();
  const linkAttached =
    await generate_random_community_platform_member_posts_link_attach_post_link(
      memberConnection,
      {
        params: {
          postId: createdPostId,
        },
        body: {
          href: canonicalHref,
          displayTitle,
          displayDescription,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(linkAttached);
  TestValidator.equals(
    "postType switched to link",
    linkAttached.postType,
    "link",
  );
  TestValidator.notEquals(
    "textContent does not keep original text after switching",
    linkAttached.textContent,
    textBody,
  );
}
