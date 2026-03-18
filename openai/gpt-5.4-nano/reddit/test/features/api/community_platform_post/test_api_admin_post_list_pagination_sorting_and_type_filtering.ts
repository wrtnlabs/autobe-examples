import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_admin_post_list_pagination_sorting_and_type_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization: create admin account then login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: ("" + "") as string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2) MemberA authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 3) Create a community owned by MemberA
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: (
          `https://example.com/icon/${typia.random<string & tags.Format<"uuid">>()}`
        ) as string & tags.MinLength<1> & tags.MaxLength<80000>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  // 4) Subscribe MemberA to the community
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 5) Create 3 posts in the same community authored by MemberA
  const keyword = RandomGenerator.alphabets(8);
  const textTitle = `text-${keyword}`;
  const linkHref = `https://example.com/${RandomGenerator.alphabets(6)}`;
  const linkTitle = `link-${keyword}`;
  const imageTitle = `image-${keyword}`;
  // Text
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: textTitle,
        body_text: `body-${keyword}-${RandomGenerator.paragraph({ sentences: 1 })}`,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Link
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: linkTitle,
        link: {
          href: linkHref,
          display_title: `display-${RandomGenerator.alphabets(6)}`,
          display_description: `desc-${RandomGenerator.alphabets(10)}`,
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Image
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: imageTitle,
        image: {
          image_cover_url:
            `https://example.com/cover/${RandomGenerator.alphabets(6)}.png` as string &
              tags.Format<"uri">,
          image_alt_text: `alt-${RandomGenerator.alphabets(8)}`,
          attachments: [
            {
              file_url:
                `https://example.com/file/${RandomGenerator.alphabets(6)}.png` as string &
                  tags.Format<"uri">,
              content_type: "image/png",
              file_size_bytes: 1024,
              image_width_px: 64,
              image_height_px: 64,
              alt_text: `att-alt-${RandomGenerator.alphabets(8)}`,
              sort_order: 0,
            } satisfies ICommunityPlatformPostImage.ICreate,
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 6-7) Admin list: filter for text posts
  const requestBase = {
    communityId: community.id,
    authorId: member.id,
    postType: "text",
    page: 1,
    limit: 2,
    sortField: "posted_at",
  } satisfies ICommunityPlatformPost.IRequest;
  const pageDesc = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        ...requestBase,
        sortDirection: "desc",
      },
    },
  );
  typia.assert(pageDesc);
  TestValidator.equals("pagination.current", pageDesc.pagination.current, 1);
  TestValidator.equals("pagination.limit", pageDesc.pagination.limit, 2);
  TestValidator.predicate(
    "pagination.records non-negative",
    pageDesc.pagination.records >= 0,
  );
  const keywordInBody = (s: string) => s.includes(keyword);
  for (const item of pageDesc.data) {
    TestValidator.equals("item.postType is text", item.postType, "text");
    TestValidator.predicate("item.body contains keyword", () =>
      keywordInBody(item.body),
    );
    TestValidator.equals("item.linkUrl is null", item.linkUrl, null);
    TestValidator.equals(
      "item.imageCoverUrl is null",
      item.imageCoverUrl,
      null,
    );
  }
  const textIdsDesc = pageDesc.data.map((x) => x.id);
  // 8-9) Same filters with asc direction
  const pageAsc = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        ...requestBase,
        sortDirection: "asc",
      },
    },
  );
  typia.assert(pageAsc);
  const textIdsAsc = pageAsc.data.map((x) => x.id);
  TestValidator.equals(
    "same number of items",
    textIdsAsc.length,
    textIdsDesc.length,
  );
  const ascSet = new Set(textIdsAsc);
  TestValidator.predicate("asc contains all desc ids", () =>
    textIdsDesc.every((id) => ascSet.has(id)),
  );
  const reversed = [...textIdsDesc].reverse();
  TestValidator.equals("ordering reversed", textIdsAsc, reversed);
}
