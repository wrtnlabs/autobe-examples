import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFeedCache";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_top_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test community ID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test top sorting without time filter - all posts sorted by vote_score
  const responseAllTime =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "top" as const,
      },
    });
  typia.assert(responseAllTime);
  // 3. Test top sorting with timeFilter=today
  const responseToday =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "top" as const,
        timeFilter: "today" as const,
      },
    });
  typia.assert(responseToday);
  // 4. Test top sorting with timeFilter=week
  const responseWeek =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "top" as const,
        timeFilter: "week" as const,
      },
    });
  typia.assert(responseWeek);
  // 5. Test top sorting with timeFilter=month
  const responseMonth =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "top" as const,
        timeFilter: "month" as const,
      },
    });
  typia.assert(responseMonth);
  // 6. Test top sorting with timeFilter=year
  const responseYear =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "top" as const,
        timeFilter: "year" as const,
      },
    });
  typia.assert(responseYear);
  // 7. Test top sorting with timeFilter=all
  const responseAll =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "top" as const,
        timeFilter: "all" as const,
      },
    });
  typia.assert(responseAll);
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "all time: pagination pages calculated correctly",
    responseAllTime.pagination.pages ===
      Math.ceil(
        responseAllTime.pagination.records / responseAllTime.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "today: pagination pages calculated correctly",
    responseToday.pagination.pages ===
      Math.ceil(
        responseToday.pagination.records / responseToday.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "week: pagination pages calculated correctly",
    responseWeek.pagination.pages ===
      Math.ceil(
        responseWeek.pagination.records / responseWeek.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "month: pagination pages calculated correctly",
    responseMonth.pagination.pages ===
      Math.ceil(
        responseMonth.pagination.records / responseMonth.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "year: pagination pages calculated correctly",
    responseYear.pagination.pages ===
      Math.ceil(
        responseYear.pagination.records / responseYear.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "all time filter: pagination pages calculated correctly",
    responseAll.pagination.pages ===
      Math.ceil(responseAll.pagination.records / responseAll.pagination.limit),
  );
  // 9. Test that posts are ordered by vote_score descending for each filter
  const validateSortOrder = (
    title: string,
    data: IRedditCommunityPost.ISummary[],
  ) => {
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        TestValidator.predicate(
          `${title}: post ${i} has lower or equal vote score than post ${i - 1}`,
          data[i].vote_score <= data[i - 1].vote_score,
        );
      }
    }
  };
  validateSortOrder("all time", responseAllTime.data);
  validateSortOrder("today", responseToday.data);
  validateSortOrder("week", responseWeek.data);
  validateSortOrder("month", responseMonth.data);
  validateSortOrder("year", responseYear.data);
  validateSortOrder("all filter", responseAll.data);
  // 10. Test pagination with custom limit
  const responseWithLimit =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "top" as const,
        timeFilter: "today" as const,
        limit: 10,
        page: 1,
      },
    });
  typia.assert(responseWithLimit);
  TestValidator.equals(
    "custom limit: pagination limit",
    responseWithLimit.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit: pagination records matches today",
    responseWithLimit.pagination.records,
    responseToday.pagination.records,
  );
  // 11. Test time filter ignored with non-top sort types
  const responseHotToday =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "hot" as const,
        timeFilter: "today" as const,
      },
    });
  typia.assert(responseHotToday);
  TestValidator.predicate(
    "hot sort: timeFilter ignored, all posts returned",
    responseHotToday.pagination.records >= responseAllTime.pagination.records,
  );
  const responseNewToday =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "new" as const,
        timeFilter: "today" as const,
      },
    });
  typia.assert(responseNewToday);
  TestValidator.predicate(
    "new sort: timeFilter ignored, all posts returned",
    responseNewToday.pagination.records >= responseAllTime.pagination.records,
  );
  // 12. Test page number functionality
  const responsePage2 =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId,
      body: {
        sortType: "top" as const,
        page: 2,
        limit: 10,
      },
    });
  typia.assert(responsePage2);
  TestValidator.equals(
    "page 2: pagination current",
    responsePage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2: pagination limit",
    responsePage2.pagination.limit,
    10,
  );
}
