import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_ban_appeal_empty_queue(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: "https://test-community.example.com/register",
      referrer: "https://test-community.example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Query ban appeals with no appeals existing (default request)
  const emptyResult =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {} satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(emptyResult);

  // Step 3: Validate empty result structure
  TestValidator.equals("empty data array", emptyResult.data, []);
  TestValidator.equals("zero records", emptyResult.pagination.records, 0);
  TestValidator.equals("zero pages", emptyResult.pagination.pages, 0);
  TestValidator.predicate(
    "valid pagination limit",
    emptyResult.pagination.limit > 0,
  );

  // Step 4: Test requesting page beyond available data
  const beyondPage2 =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(beyondPage2);
  TestValidator.equals("beyond page data is empty", beyondPage2.data, []);
  TestValidator.equals(
    "beyond page records zero",
    beyondPage2.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond page pages zero",
    beyondPage2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "beyond page current is 2",
    beyondPage2.pagination.current,
    2,
  );

  // Step 5: Test with various filters that should match no records
  const statusFiltered =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          status: "pending",
          limit: 20,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(statusFiltered);
  TestValidator.equals("status filtered empty", statusFiltered.data, []);
  TestValidator.equals(
    "status filtered zero records",
    statusFiltered.pagination.records,
    0,
  );

  // Step 6: Test with date range filters
  const dateFiltered =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          submitted_after: new Date(Date.now() - 86400000).toISOString(),
          submitted_before: new Date().toISOString(),
          limit: 50,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals("date filtered empty", dateFiltered.data, []);
  TestValidator.equals(
    "date filtered zero records",
    dateFiltered.pagination.records,
    0,
  );

  // Step 7: Test with search query
  const searchFiltered =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          search: "nonexistent appeal text",
          limit: 15,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(searchFiltered);
  TestValidator.equals("search filtered empty", searchFiltered.data, []);
  TestValidator.equals(
    "search filtered zero records",
    searchFiltered.pagination.records,
    0,
  );

  // Step 8: Test with sorting options on empty dataset
  const sortedEmpty =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          sort_by: "submitted_at",
          sort_order: "desc",
          limit: 25,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(sortedEmpty);
  TestValidator.equals("sorted empty data", sortedEmpty.data, []);
  TestValidator.equals(
    "sorted empty zero records",
    sortedEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorted empty zero pages",
    sortedEmpty.pagination.pages,
    0,
  );
}
