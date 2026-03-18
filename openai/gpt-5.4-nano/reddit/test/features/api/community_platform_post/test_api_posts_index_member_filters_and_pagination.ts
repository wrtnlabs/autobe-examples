import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_posts_index_member_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Member browsing post feed with combined filters and pagination.
  // 1) Authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  // 2) Community
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Subscribe
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4) Create post (text) matching filters
  const keyword = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 2 }),
  );
  const title = `post-${keyword}-${RandomGenerator.alphabets(6)}`;
  const postType = "text";
  // We don't know exact server postedAt before indexing; use a tight window around now.
  const postedAtFrom = new Date(Date.now() - 60000).toISOString();
  const postedAtTo = new Date(Date.now() + 60000).toISOString();
  await api.functional.communityPlatform.member.posts.create(memberConnection, {
    body: {
      community_id: community.id,
      post_type: postType,
      title,
      body_text: `body-${keyword}-${RandomGenerator.alphabets(8)}`,
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // 5) Index with filters
  const indexResponse =
    await api.functional.communityPlatform.member.posts.index(
      memberConnection,
      {
        body: {
          communityId: community.id,
          authorId: memberId,
          postType,
          keyword,
          postedAtFrom,
          postedAtTo,
          page: 1,
          limit: 2,
          sortField: "posted_at",
          sortDirection: "desc",
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(indexResponse);
  // 6) Validate pagination
  TestValidator.equals(
    "current page matches request",
    indexResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data size within limit",
    indexResponse.data.length <= indexResponse.pagination.limit,
  );
  // Ensure we got at least one matching post for the exact created post scenario.
  TestValidator.predicate(
    "at least one returned post matches created filters",
    indexResponse.data.some((p) => {
      return (
        p.postType === postType &&
        (p.title.includes(keyword) || p.body.includes(keyword)) &&
        p.author.id === memberId &&
        new Date(p.postedAt).getTime() >= new Date(postedAtFrom).getTime() &&
        new Date(p.postedAt).getTime() <= new Date(postedAtTo).getTime()
      );
    }),
  );
  // 7) Validate each returned post matches filters
  const fromMs = new Date(postedAtFrom).getTime();
  const toMs = new Date(postedAtTo).getTime();
  for (const item of indexResponse.data) {
    typia.assert(item);
    TestValidator.equals("post type matches", item.postType, postType);
    TestValidator.equals("author id matches", item.author.id, memberId);
    TestValidator.predicate(
      "keyword matches title or body",
      item.title.includes(keyword) || item.body.includes(keyword),
    );
    TestValidator.predicate(
      "author display name non-empty",
      item.author.display_name.length > 0,
    );
    const postedAtMs = new Date(item.postedAt).getTime();
    TestValidator.predicate(
      "postedAt within window",
      postedAtMs >= fromMs && postedAtMs <= toMs,
    );
  }
  // Basic identity presence checks (already enforced by typia.assert, but keep as scenario-level assertions)
  TestValidator.predicate(
    "each returned post has id",
    indexResponse.data.every((p) => p.id.length > 0),
  );
}
