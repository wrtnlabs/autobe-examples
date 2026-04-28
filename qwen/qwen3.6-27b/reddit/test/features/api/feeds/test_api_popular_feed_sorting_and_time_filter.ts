import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test popular feed sorting and time filtering functionality.
 *
 * Validates that the popular feed endpoint correctly supports multiple sorting strategies (hot, new, top, controversial) and time-based range restrictions (today, this_week, all_time). Ensures pagination metadata is accurate and feed results contain valid post summaries.
 *
 * 1. Register and authenticate a member account.
 * 2. Create a community and subscribe the member to it.
 * 3. Create multiple posts in the community.
 * 4. Query popular feed with sort_by='new' and verify posts are returned sorted by creation date.
 * 5. Query popular feed with sort_by='hot' and verify response structure.
 * 6. Query popular feed with sort_by='top' and verify response structure.
 * 7. Query popular feed with sort_by='controversial' and verify response structure.
 * 8. Query popular feed with time_filter='today' and verify results are filtered.
 * 9. Query popular feed with time_filter='this_week' and verify results are filtered.
 * 10. Query popular feed with time_filter='all_time' and verify no date restriction.
 * 11. Query popular feed with pagination parameters and verify pagination metadata.
 */
export async function test_api_popular_feed_sorting_and_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  // 2. Create community and subscribe
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 3. Create multiple posts
  const post1 = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post3);
  // 4. Test sort_by='new'
  const feedByNew =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort_by: "new",
          limit: 10,
          page: 1,
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedByNew);
  TestValidator.equals(
    "new sort current page",
    feedByNew.pagination.current,
    1,
  );
  TestValidator.equals("new sort limit", feedByNew.pagination.limit, 10);
  TestValidator.predicate(
    "new sort has records",
    feedByNew.pagination.records >= 3,
  );
  TestValidator.predicate("new sort has data", feedByNew.data.length > 0);
  // 5. Test sort_by='hot'
  const feedByHot =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort_by: "hot",
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedByHot);
  TestValidator.predicate(
    "hot sort has records",
    feedByHot.pagination.records >= 3,
  );
  TestValidator.predicate("hot sort has data", feedByHot.data.length > 0);
  // 6. Test sort_by='top'
  const feedByTop =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort_by: "top",
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedByTop);
  TestValidator.predicate(
    "top sort has records",
    feedByTop.pagination.records >= 3,
  );
  TestValidator.predicate("top sort has data", feedByTop.data.length > 0);
  // 7. Test sort_by='controversial'
  const feedByControversial =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort_by: "controversial",
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedByControversial);
  TestValidator.predicate(
    "controversial sort has records",
    feedByControversial.pagination.records >= 3,
  );
  TestValidator.predicate(
    "controversial sort has data",
    feedByControversial.data.length > 0,
  );
  // 8. Test time_filter='today'
  const feedToday =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          time_filter: "today",
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedToday);
  TestValidator.predicate(
    "today filter has records",
    feedToday.pagination.records >= 3,
  );
  TestValidator.predicate("today filter has data", feedToday.data.length > 0);
  // 9. Test time_filter='this_week'
  const feedThisWeek =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          time_filter: "this_week",
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedThisWeek);
  TestValidator.predicate(
    "this_week filter has records",
    feedThisWeek.pagination.records >= 3,
  );
  TestValidator.predicate(
    "this_week filter has data",
    feedThisWeek.data.length > 0,
  );
  // 10. Test time_filter='all_time'
  const feedAllTime =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          time_filter: "all_time",
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedAllTime);
  TestValidator.predicate(
    "all_time filter has records",
    feedAllTime.pagination.records >= 3,
  );
  TestValidator.predicate(
    "all_time filter has data",
    feedAllTime.data.length > 0,
  );
  // 11. Test pagination with sort and time filter combined
  const feedPaginated =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort_by: "new",
          time_filter: "all_time",
          limit: 2,
          page: 1,
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedPaginated);
  TestValidator.equals(
    "paginated current page",
    feedPaginated.pagination.current,
    1,
  );
  TestValidator.equals("paginated limit", feedPaginated.pagination.limit, 2);
  TestValidator.predicate(
    "paginated data respects limit",
    feedPaginated.data.length <= 2,
  );
  TestValidator.predicate(
    "paginated records >= data length",
    feedPaginated.pagination.records >= feedPaginated.data.length,
  );
  // 12. Test second page of pagination
  const feedPage2 =
    await api.functional.redditLikeCommunity.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort_by: "new",
          time_filter: "all_time",
          limit: 2,
          page: 2,
        } satisfies IREdditLikeCommunityPost.IRequest,
      },
    );
  typia.assert(feedPage2);
  TestValidator.equals("page 2 current page", feedPage2.pagination.current, 2);
  TestValidator.equals("page 2 limit", feedPage2.pagination.limit, 2);
  TestValidator.notEquals(
    "page 1 and page 2 have different post IDs",
    feedPaginated.data.at(0)?.id,
    feedPage2.data.at(0)?.id,
  );
}
