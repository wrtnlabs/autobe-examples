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

export async function test_api_admin_post_list_keyword_and_time_range_filters_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  const keyword = `kw_${RandomGenerator.alphabets(10)}`;
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: `https://example.com/h/${RandomGenerator.alphaNumeric(8)}` satisfies string &
        tags.Format<"uri">,
      referrer:
        `https://example.com/r/${RandomGenerator.alphaNumeric(8)}` satisfies string &
          tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_admin_login(
    { host: connection.host },
    {
      body: {
        email: admin.email,
        password: "" as never,
      } satisfies ICommunityPlatformAdmin.ILogin,
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: `c_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon_${RandomGenerator.alphabets(6)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  const createTextPost = async (input: { title: string; body: string }) => {
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: input.title,
          body_text: input.body,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  };
  // Create 2 keyword posts OUTSIDE the time range
  await createTextPost({
    title: `${keyword} out A`,
    body: `body ${keyword} out A`,
  });
  const rangeFrom = new Date();
  // Create 2 keyword posts WITHIN the time range
  await createTextPost({
    title: `${keyword} in B`,
    body: `body ${keyword} in B`,
  });
  await createTextPost({
    title: `${keyword} in C`,
    body: `body ${keyword} in C`,
  });
  const rangeTo = new Date();
  // Create 1 post within range but WITHOUT keyword
  await createTextPost({
    title: `non-keyword in D`,
    body: `body non-keyword in D ${RandomGenerator.paragraph({ sentences: 1 })}`,
  });
  // Create 2 keyword posts OUTSIDE the time range
  await createTextPost({
    title: `${keyword} out E`,
    body: `body ${keyword} out E`,
  });
  await createTextPost({
    title: `${keyword} out F`,
    body: `body ${keyword} out F`,
  });
  const requestPage1 = {
    communityId: community.id,
    postType: "text",
    postedAtFrom: rangeFrom.toISOString(),
    postedAtTo: rangeTo.toISOString(),
    keyword,
    page: 1 satisfies ICommunityPlatformPost.IRequest["page"],
    limit: 1 satisfies ICommunityPlatformPost.IRequest["limit"],
    sortField: "posted_at",
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformPost.IRequest;
  const page1 = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    { body: requestPage1 },
  );
  typia.assert(page1);
  TestValidator.equals("records count", page1.pagination.records, 2);
  TestValidator.equals("page current", page1.pagination.current, 1);
  TestValidator.equals("page limit", page1.pagination.limit, 1);
  TestValidator.predicate("page has exactly 1 item", page1.data.length === 1);
  const page1Item = page1.data[0]!;
  TestValidator.predicate(
    "page1 item postedAt within range",
    page1Item.postedAt >= requestPage1.postedAtFrom &&
      page1Item.postedAt <= requestPage1.postedAtTo,
  );
  TestValidator.predicate(
    "page1 item contains keyword in title/body",
    page1Item.title.includes(keyword) || page1Item.body.includes(keyword),
  );
  const requestPage2 = {
    ...requestPage1,
    page: 2 satisfies ICommunityPlatformPost.IRequest["page"],
  } satisfies ICommunityPlatformPost.IRequest;
  const page2 = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    { body: requestPage2 },
  );
  typia.assert(page2);
  TestValidator.equals("records count on page2", page2.pagination.records, 2);
  TestValidator.equals("page current", page2.pagination.current, 2);
  TestValidator.equals("page limit", page2.pagination.limit, 1);
  TestValidator.predicate("page2 has exactly 1 item", page2.data.length === 1);
  const page2Item = page2.data[0]!;
  TestValidator.notEquals("page2 id differs", page1Item.id, page2Item.id);
  TestValidator.equals(
    "covers all matching posts",
    new Set([page1Item.id, page2Item.id]).size,
    2,
  );
}
