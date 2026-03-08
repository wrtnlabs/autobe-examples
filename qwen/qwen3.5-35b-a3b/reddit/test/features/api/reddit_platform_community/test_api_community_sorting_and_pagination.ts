import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Get communities with sort by subscriber_count DESC
  const descResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        sort: "subscriber_count",
        order: "desc",
        limit: 100,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(descResult);
  // Test 1: Verify descending order by subscriber_count
  for (let i = 1; i < descResult.data.length; i++) {
    const prev = descResult.data[i - 1];
    const curr = descResult.data[i];
    TestValidator.predicate(
      "subscriber_count descending order",
      prev.subscriber_count >= curr.subscriber_count,
    );
  }
  // Get communities with sort by subscriber_count ASC
  const ascResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        sort: "subscriber_count",
        order: "asc",
        limit: 100,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(ascResult);
  // Test 2: Verify ascending order by subscriber_count
  for (let i = 1; i < ascResult.data.length; i++) {
    const prev = ascResult.data[i - 1];
    const curr = ascResult.data[i];
    TestValidator.predicate(
      "subscriber_count ascending order",
      prev.subscriber_count <= curr.subscriber_count,
    );
  }
  // Get communities with sort by name (alphabetical)
  const nameResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        sort: "name",
        order: "asc",
        limit: 100,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(nameResult);
  // Test 3: Verify alphabetical order by name
  for (let i = 1; i < nameResult.data.length; i++) {
    const prev = nameResult.data[i - 1].name;
    const curr = nameResult.data[i].name;
    TestValidator.predicate(
      "name alphabetical ascending order",
      prev.localeCompare(curr) <= 0,
    );
  }
  // Test 4: Pagination with custom page size (limit=50)
  const limitResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        limit: 50,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(limitResult);
  TestValidator.equals("pagination limit", limitResult.pagination.limit, 50);
  TestValidator.predicate(
    "data length within limit",
    limitResult.data.length <= 50,
  );
  TestValidator.predicate(
    "records total matches expected",
    limitResult.pagination.records > 0,
  );
  // Test 5: Pagination with custom page number
  const pageResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals("current page", pageResult.pagination.current, 2);
  TestValidator.predicate(
    "data array size within limit",
    pageResult.data.length <= 10,
  );
  // Test 6: Range filtering (minSubscribers and maxSubscribers)
  const filterResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        minSubscribers: 0,
        maxSubscribers: 1000,
        limit: 100,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(filterResult);
  // Verify all results within range
  for (const community of filterResult.data) {
    TestValidator.predicate(
      "subscriber_count within range",
      community.subscriber_count >= 0 && community.subscriber_count <= 1000,
    );
  }
  // Test 7: Combined filtering (search + sort + pagination)
  const combinedResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        name: "tech",
        sort: "subscriber_count",
        order: "desc",
        limit: 10,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals("combined limit", combinedResult.pagination.limit, 10);
  // Verify name search matches
  for (const community of combinedResult.data) {
    TestValidator.predicate(
      "name contains search term",
      community.name.toLowerCase().includes("tech"),
    );
  }
  // Verify sort order in combined results
  for (let i = 1; i < combinedResult.data.length; i++) {
    const prev = combinedResult.data[i - 1];
    const curr = combinedResult.data[i];
    TestValidator.predicate(
      "combined sort order",
      prev.subscriber_count >= curr.subscriber_count,
    );
  }
  // Test 8: Verify pagination calculations
  TestValidator.predicate(
    "pages calculated correctly",
    Math.ceil(limitResult.pagination.records / limitResult.pagination.limit) ===
      limitResult.pagination.pages,
  );
  TestValidator.predicate(
    "pages calculated correctly for page result",
    Math.ceil(pageResult.pagination.records / pageResult.pagination.limit) ===
      pageResult.pagination.pages,
  );
  // Test 9: Verify offset calculation for page 2
  const secondPage = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        page: 2,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
}