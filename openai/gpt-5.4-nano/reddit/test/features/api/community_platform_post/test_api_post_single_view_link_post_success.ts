import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_single_view_link_post_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberAuthorized);

  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });

  const createdCommunity =
    await generate_random_community_platform_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href:
            `https://example.com/icon/${RandomGenerator.alphabets(8)}` satisfies string &
              tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  await generate_random_community_platform_community_subscriptions_create(
    userConnection,
    {
      body: {
        community_id: createdCommunity.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );

  const canonicalUrl =
    `https://example.com/${RandomGenerator.alphabets(12)}` satisfies string &
      tags.Format<"uri">;

  await generate_random_community_platform_member_posts_create(userConnection, {
    body: {
      community_id: createdCommunity.id,
      post_type: "link",
      title: RandomGenerator.name(),
      link: {
        href: canonicalUrl,
        display_title: RandomGenerator.name(),
        display_description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    } satisfies ICommunityPlatformPost.ICreate,
  });

  const postId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.communityPlatform.member.posts.at(
    userConnection,
    {
      postId,
    },
  );
  typia.assert(response);

  if (response.postType === "link") {
    const linkContent = typia.assert<string>(response.linkContent);

    TestValidator.equals(
      "link content equals canonical url",
      linkContent,
      canonicalUrl,
    );
    TestValidator.equals("image content is null", response.imageContent, null);
    TestValidator.predicate(
      "linkContent must be non-null for link post",
      linkContent !== null,
    );
  }
}
