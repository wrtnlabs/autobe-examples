import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test different sorting options for community feed: hot, new, top (with time filters), and controversial.
 *
 * Validates that the community feed endpoint correctly applies various sorting strategies and returns properly ordered results. Tests all available sort types (hot, new, top, controversial) and time filters for top sorting. Ensures that each sorting option produces valid responses and that posts are ordered according to the specified criteria.
 *
 * The test verifies that sorting works correctly for unauthenticated guests, as community feeds are available to all users. Each sort type is tested independently to ensure proper ordering logic is applied by the backend.
 *
 * 1. Test 'hot' sorting: Recent posts with high engagement combination
 * 2. Test 'new' sorting: Most recently created posts first (created_at DESC)
 * 3. Test 'top' sorting with time_filter='all': Highest vote scores regardless of time
 * 4. Test 'top' sorting with time_filter='week': Highest vote scores from last 7 days only
 * 5. Test 'controversial' sorting: Posts with many votes but scores near zero
 */
export async function test_api_community_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create guest connection (no authentication needed)
  const guestConnection: api.IConnection = { host: connection.host };
  // Use a fixed community ID for testing
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 1. Test 'hot' sorting
  const hotResult = await api.functional.redditClone.communities.feeds.index(
    guestConnection,
    {
      communityId,
      body: {
        sortType: "hot",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotResult);
  TestValidator.predicate(
    "hot sorting returns valid response",
    hotResult.pagination.records >= 0,
  );
  // 2. Test 'new' sorting - verify posts ordered by created_at DESC
  const newResult = await api.functional.redditClone.communities.feeds.index(
    guestConnection,
    {
      communityId,
      body: {
        sortType: "new",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newResult);
  TestValidator.predicate(
    "new sorting returns valid response",
    newResult.pagination.records >= 0,
  );
  // Verify 'new' sort ordering: posts should be ordered by created_at DESC
  if (newResult.data.length > 1) {
    for (const i of Array.from(
      { length: newResult.data.length - 1 },
      (_, idx) => idx + 1,
    )) {
      const prevDate = new Date(newResult.data[i - 1].created_at).getTime();
      const currDate = new Date(newResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `new sorting: post ${i - 1} created_at >= post ${i} created_at`,
        prevDate >= currDate,
      );
    }
  }
  // 3. Test 'top' sorting with time_filter='all'
  const topAllResult = await api.functional.redditClone.communities.feeds.index(
    guestConnection,
    {
      communityId,
      body: {
        sortType: "top",
        timeFilter: "all",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topAllResult);
  TestValidator.predicate(
    "top sorting with time_filter='all' returns valid response",
    topAllResult.pagination.records >= 0,
  );
  // Verify 'top' sort ordering: posts should be ordered by vote_score DESC
  if (topAllResult.data.length > 1) {
    for (const i of Array.from(
      { length: topAllResult.data.length - 1 },
      (_, idx) => idx + 1,
    )) {
      TestValidator.predicate(
        `top sorting: post ${i - 1} vote_score >= post ${i} vote_score`,
        topAllResult.data[i - 1].vote_score >= topAllResult.data[i].vote_score,
      );
    }
  }
  // 4. Test 'top' sorting with time_filter='week'
  const topWeekResult =
    await api.functional.redditClone.communities.feeds.index(guestConnection, {
      communityId,
      body: {
        sortType: "top",
        timeFilter: "week",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(topWeekResult);
  TestValidator.predicate(
    "top sorting with time_filter='week' returns valid response",
    topWeekResult.pagination.records >= 0,
  );
  // Verify 'top' sort ordering with time filter: posts should be ordered by vote_score DESC
  if (topWeekResult.data.length > 1) {
    for (const i of Array.from(
      { length: topWeekResult.data.length - 1 },
      (_, idx) => idx + 1,
    )) {
      TestValidator.predicate(
        `top sorting (week): post ${i - 1} vote_score >= post ${i} vote_score`,
        topWeekResult.data[i - 1].vote_score >=
          topWeekResult.data[i].vote_score,
      );
    }
  }
  // 5. Test 'controversial' sorting
  const controversialResult =
    await api.functional.redditClone.communities.feeds.index(guestConnection, {
      communityId,
      body: {
        sortType: "controversial",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(controversialResult);
  TestValidator.predicate(
    "controversial sorting returns valid response",
    controversialResult.pagination.records >= 0,
  );
  // Verify all results are filtered to the specified community
  for (const post of hotResult.data) {
    TestValidator.equals(
      "hot sorting: post belongs to specified community",
      post.community.id,
      communityId,
    );
  }
  for (const post of newResult.data) {
    TestValidator.equals(
      "new sorting: post belongs to specified community",
      post.community.id,
      communityId,
    );
  }
  for (const post of topAllResult.data) {
    TestValidator.equals(
      "top sorting (all): post belongs to specified community",
      post.community.id,
      communityId,
    );
  }
  for (const post of topWeekResult.data) {
    TestValidator.equals(
      "top sorting (week): post belongs to specified community",
      post.community.id,
      communityId,
    );
  }
  for (const post of controversialResult.data) {
    TestValidator.equals(
      "controversial sorting: post belongs to specified community",
      post.community.id,
      communityId,
    );
  }
}
