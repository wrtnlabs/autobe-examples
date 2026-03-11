import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_post_snapshots_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "testpassword123",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community (required before creating posts)
  await generate_random_reddit_platform_member_subscriptions_subscribe(
    memberConnection,
    {
      body: {
        reddit_platform_community_id: community.id,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // Note: Post creation endpoints not available in provided API list,
  // so we'll test with a random post ID that will return empty snapshots
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test default query (no filters)
  const defaultResult = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId,
      body: {},
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals("default query pagination", defaultResult.pagination, {
    current: 1,
    limit: 20,
    records: 0,
    pages: 0,
  } satisfies IPage.IPagination);
  // 5. Test type filter
  const typeFiltered = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId,
      body: {
        snapshot_type: "EDIT",
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(typeFiltered);
  // 6. Test date range filter
  const startDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const endDate = new Date();
  const dateFiltered = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId,
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(dateFiltered);
  // 7. Test combined filters
  const combinedFilter = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId,
      body: {
        snapshot_type: "EDIT",
        start_date: startDate.toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter pagination",
    combinedFilter.pagination,
    {
      current: 1,
      limit: 10,
      records: 0,
      pages: 0,
    } satisfies IPage.IPagination,
  );
  // 8. Test pagination with page=1, limit=5
  const page1Result = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId,
      body: {
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 limit 5 pagination", page1Result.pagination, {
    current: 1,
    limit: 5,
    records: 0,
    pages: 0,
  } satisfies IPage.IPagination);
  // 9. Test sort ascending
  const ascResult = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(ascResult);
  // 10. Test sort descending
  const descResult = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId,
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(descResult);
  // 11. Test author filter
  const authorFiltered = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId,
      body: {
        author_id: member.id,
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(authorFiltered);
}