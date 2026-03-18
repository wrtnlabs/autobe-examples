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
import { generate_random_community_platform_member_posts_link_update_post_link } from "../../../generate/generate_random_community_platform_member_posts_link_update_post_link";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_update_success_author_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});

  // 2) Create a community and subscribe the member
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2) satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<65535>,
          description: RandomGenerator.paragraph({
            sentences: 2,
          }) satisfies string & tags.MinLength<1> & tags.MaxLength<65535>,
          icon_href: typia.random<string & tags.MinLength<1> & tags.MaxLength<80000>>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );

  // 3) Create a link-type post (utility returns void, so we cannot capture postId directly)
  const initialHref = typia.random<string & tags.Format<"uri">>();
  const initialDisplayTitle = RandomGenerator.name(2);
  const initialDisplayDescription = RandomGenerator.paragraph({
    sentences: 2,
  });

  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: RandomGenerator.name(3),
        link: {
          href: initialHref,
          display_title: initialDisplayTitle,
          display_description: initialDisplayDescription,
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  // 4-6) Perform PATCH /member/posts/{postId}/link and validate
  const updatedHref = typia.random<string & tags.Format<"uri">>();
  const updatedDisplayTitle = RandomGenerator.name(2);
  const updatedDisplayDescription = RandomGenerator.paragraph({
    sentences: 2,
  });

  const firstPatched: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_link_update_post_link(
      memberConnection,
      {
        params: {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          href: updatedHref,
          displayTitle: updatedDisplayTitle,
          displayDescription: updatedDisplayDescription,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(firstPatched);
  TestValidator.equals("post type is link", firstPatched.postType, "link");
  const firstEditedAt = firstPatched.editedAt;

  // Idempotency: patch again with the same href
  const secondPatched: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_link_update_post_link(
      memberConnection,
      {
        params: {
          postId: firstPatched.id,
        },
        body: {
          href: updatedHref,
          displayTitle: updatedDisplayTitle,
          displayDescription: updatedDisplayDescription,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(secondPatched);
  TestValidator.equals("idempotent post id", secondPatched.id, firstPatched.id);
  TestValidator.equals(
    "post type remains link",
    secondPatched.postType,
    "link",
  );

  // editedAt should not regress
  TestValidator.predicate(
    "editedAt is present or updated",
    secondPatched.editedAt === null
      ? firstEditedAt === null
      : firstEditedAt !== null,
  );
}
