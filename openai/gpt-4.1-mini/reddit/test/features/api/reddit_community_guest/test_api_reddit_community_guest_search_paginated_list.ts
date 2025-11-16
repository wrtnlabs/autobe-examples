import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_reddit_community_guest_search_paginated_list(
  connection: api.IConnection,
) {
  // Query with empty filter (default pagination)
  const emptyFilter = {
    page: 1,
    limit: 10,
    filter: {},
    my_items_only: false,
    include_archived: false,
  } satisfies IRedditCommunityGuest.IRequest;

  const firstPage: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.redditCommunity.guests.index(
      connection,
      { body: emptyFilter },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "Pagination current page > 0",
    firstPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "Pagination limit > 0",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Pagination total pages >= 0",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Pagination records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Data length not exceeding limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );

  // Search with keyword mostly from existing data
  const keyword =
    firstPage.data.length > 0
      ? RandomGenerator.substring(firstPage.data[0].nickname)
      : "guest";
  const searchFilter = {
    page: 1,
    limit: 5,
    search: keyword,
  } satisfies IRedditCommunityGuest.IRequest;

  const searchPage: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.redditCommunity.guests.index(
      connection,
      { body: searchFilter },
    );
  typia.assert(searchPage);
  TestValidator.predicate(
    "Search results not exceeding limit",
    searchPage.data.length <= searchPage.pagination.limit,
  );

  // Filter by ip_address and device_type
  const ipDeviceFilter = {
    page: 1,
    limit: 5,
    ip_address: firstPage.data.length > 0 ? "127.0.0.1" : undefined,
    device_type: "desktop",
  } satisfies IRedditCommunityGuest.IRequest;

  const ipDevicePage: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.redditCommunity.guests.index(
      connection,
      { body: ipDeviceFilter },
    );
  typia.assert(ipDevicePage);

  // Filter by session duration range
  const sessionDurationFilter = {
    page: 1,
    limit: 5,
    session_duration_min: 10,
    session_duration_max: 600,
  } satisfies IRedditCommunityGuest.IRequest;

  const sessionDurationPage: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.redditCommunity.guests.index(
      connection,
      { body: sessionDurationFilter },
    );
  typia.assert(sessionDurationPage);

  // Filter by created date range
  const nowISO = new Date().toISOString();
  const oneDayAgoISO = new Date(Date.now() - 86400000).toISOString();
  const dateRangeFilter = {
    page: 1,
    limit: 5,
    created_after_date: oneDayAgoISO,
    created_before_date: nowISO,
  } satisfies IRedditCommunityGuest.IRequest;

  const dateRangePage: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.redditCommunity.guests.index(
      connection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangePage);

  // Combined filter test
  const combinedFilter = {
    page: 1,
    limit: 5,
    search: keyword,
    ip_address: "127.0.0.1",
    device_type: "mobile",
    session_duration_min: 5,
    session_duration_max: 500,
    created_after_date: oneDayAgoISO,
    created_before_date: nowISO,
  } satisfies IRedditCommunityGuest.IRequest;

  const combinedPage: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.redditCommunity.guests.index(
      connection,
      { body: combinedFilter },
    );
  typia.assert(combinedPage);

  // Each data item has string id and nickname
  for (const guest of combinedPage.data) {
    TestValidator.predicate("Guest id is string", typeof guest.id === "string");
    TestValidator.predicate(
      "Guest nickname is string",
      typeof guest.nickname === "string",
    );
  }
}
