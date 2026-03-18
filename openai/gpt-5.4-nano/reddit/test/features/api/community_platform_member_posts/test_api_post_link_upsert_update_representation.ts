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

export async function test_api_post_link_upsert_update_representation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection2: api.IConnection = { host: connection.host };
  memberConnection2.headers = memberConnection.headers;
  const community = await api.functional.communityPlatform.communities.create(
    memberConnection2,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(8)}` satisfies
          string & tags.MinLength<1> & tags.MaxLength<80000>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection2,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const initialHref = `https://example.com/a/${RandomGenerator.alphabets(10)}`;
  await generate_random_community_platform_member_posts_create(
    memberConnection2,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: RandomGenerator.name(),
        link: {
          href: initialHref satisfies string & tags.Format<"uri">,
          display_title: RandomGenerator.paragraph({ sentences: 1 }),
          display_description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const postId = typia.random<string & tags.Format<"uuid">>();
  const href1 = `https://example.com/b/${RandomGenerator.alphabets(10)}`;
  const title1 = RandomGenerator.paragraph({ sentences: 1 });
  const description1 = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPost1 =
    await generate_random_community_platform_member_posts_link_attach_post_link(
      memberConnection2,
      {
        params: { postId },
        body: {
          href: href1 satisfies string & tags.Format<"uri">,
          displayTitle: title1,
          displayDescription: description1,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updatedPost1);
  TestValidator.equals(
    "post id stable after first upsert",
    updatedPost1.id,
    postId,
  );
  TestValidator.equals("post type is link", updatedPost1.postType, "link");
  const href2 = `https://example.com/c/${RandomGenerator.alphabets(10)}`;
  const title2 = RandomGenerator.paragraph({ sentences: 1 });
  const description2 = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPost2 =
    await generate_random_community_platform_member_posts_link_attach_post_link(
      memberConnection2,
      {
        params: { postId },
        body: {
          href: href2 satisfies string & tags.Format<"uri">,
          displayTitle: title2,
          displayDescription: description2,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updatedPost2);
  TestValidator.equals(
    "post id stable after second upsert",
    updatedPost2.id,
    postId,
  );
  TestValidator.equals("post type still link", updatedPost2.postType, "link");
}
