import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardTopic";

export async function test_api_admin_topic_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to gain access to administrative endpoints
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!", // Valid password per schema requirements
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create multiple topics with different names, descriptions, and active states for testing search and pagination
  const topicNames: (
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy"
  )[] = [
    "Inflation",
    "Tax Policy",
    "Elections",
    "Global Trade",
    "Monetary Policy",
  ] as const;

  const createdTopics: IEconomicBoardTopic[] = [];

  for (const name of topicNames) {
    const topic: IEconomicBoardTopic =
      await api.functional.economicBoard.admin.topics.create(connection, {
        body: {
          name: name,
          description:
            name === "Inflation"
              ? "Monitoring price level changes over time"
              : name === "Tax Policy"
                ? "Government revenue collection and distribution policies"
                : name === "Elections"
                  ? "Democratic processes and electoral systems"
                  : name === "Global Trade"
                    ? "International commerce and trade agreements"
                    : name === "Monetary Policy"
                      ? "Central bank operations and currency management"
                      : "", // Default description
        } satisfies IEconomicBoardTopic.ICreate,
      });
    typia.assert(topic);
    createdTopics.push(topic);
  }

  // Create additional inactive topics to test filtering
  const inactiveTopic = await api.functional.economicBoard.admin.topics.create(
    connection,
    {
      body: {
        name: "Labor Markets",
        description: "Employment, wages, and workforce dynamics",
      } satisfies IEconomicBoardTopic.ICreate,
    },
  );
  typia.assert(inactiveTopic);

  const inactiveTopic2 = await api.functional.economicBoard.admin.topics.create(
    connection,
    {
      body: {
        name: "Fiscal Policy",
        description: "Government spending and budgetary decisions",
      } satisfies IEconomicBoardTopic.ICreate,
    },
  );
  typia.assert(inactiveTopic2);

  // 3. Test search with pagination by name filter (partial match)
  const searchResult1: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        name: "Infl", // Partial match for "Inflation"
        page: 1,
        limit: 3, // Test pagination: limit results to 3 per page
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(searchResult1);

  // Validate search results: should return only "Inflation" topic
  TestValidator.equals(
    "search results should have correct total count",
    searchResult1.pagination.records,
    1,
  );
  TestValidator.equals(
    "search results pagination should match page and limit",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "search results pagination should match limit",
    searchResult1.pagination.limit,
    3,
  );
  TestValidator.equals(
    "search results should have correct page count",
    searchResult1.pagination.pages,
    1,
  );
  TestValidator.equals(
    "search result should contain exactly 1 topic",
    searchResult1.data.length,
    1,
  );
  TestValidator.equals(
    "search result should contain Inflation topic",
    searchResult1.data[0].name,
    "Inflation",
  );

  // 4. Test pagination with multiple pages
  const searchResult2: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        page: 1,
        limit: 3, // Set limit to 3 to create multiple pages
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(searchResult2);

  // Validate first page - should have 3 topics
  TestValidator.equals(
    "first page should have 3 topics",
    searchResult2.data.length,
    3,
  );
  TestValidator.equals(
    "first page pagination should show 7 total records",
    searchResult2.pagination.records,
    7,
  );
  TestValidator.equals(
    "first page should be page 1",
    searchResult2.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page should show 3 pages total (7/3 rounded up)",
    searchResult2.pagination.pages,
    3,
  );

  // Get second page
  const searchResult3: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        page: 2,
        limit: 3, // Same limit to maintain pagination consistency
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(searchResult3);

  // Validate second page - should have 3 topics
  TestValidator.equals(
    "second page should have 3 topics",
    searchResult3.data.length,
    3,
  );
  TestValidator.equals(
    "second page pagination should show 7 total records",
    searchResult3.pagination.records,
    7,
  );
  TestValidator.equals(
    "second page should be page 2",
    searchResult3.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page should show 3 pages total",
    searchResult3.pagination.pages,
    3,
  );

  // Get third page (last page)
  const searchResult4: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        page: 3,
        limit: 3, // Last page should have remaining 1 topic
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(searchResult4);

  // Validate third page - should have 1 topic
  TestValidator.equals(
    "third page should have 1 topic",
    searchResult4.data.length,
    1,
  );
  TestValidator.equals(
    "third page pagination should show 7 total records",
    searchResult4.pagination.records,
    7,
  );
  TestValidator.equals(
    "third page should be page 3",
    searchResult4.pagination.current,
    3,
  );
  TestValidator.equals(
    "third page should show 3 pages total",
    searchResult4.pagination.pages,
    3,
  );

  // 5. Test filtering by active status
  const activeSearchResult: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        is_active: true, // Only active topics
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(activeSearchResult);

  // Verify only active topics are returned (initially created topics are active)
  TestValidator.equals(
    "active topics should show 6 active records (5 created above + 1 from inactiveTopic1 but not deactivated)",
    activeSearchResult.pagination.records,
    6,
  ); // 5 created originally + 1 from inactiveTopic
  TestValidator.predicate("all returned topics should be active", () =>
    activeSearchResult.data.every((topic) => topic.is_active === true),
  );

  // Test inactive filter
  const inactiveSearchResult: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        is_active: false, // Only inactive topics
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(inactiveSearchResult);

  // Verify only inactive topics are returned
  TestValidator.equals(
    "inactive topics should show 1 record for variant-controlled topics",
    inactiveSearchResult.pagination.records,
    1,
  );
  TestValidator.predicate("all returned topics should be inactive", () =>
    inactiveSearchResult.data.every((topic) => topic.is_active === false),
  );

  // 6. Test sorting by name (ascending)
  const sortedByNameResult: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        sort: "name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(sortedByNameResult);

  // Verify topics are ordered alphabetically
  const names = sortedByNameResult.data.map((topic) => topic.name);
  const sortedNames = [...names].sort();
  TestValidator.equals(
    "topics should be sorted alphabetically by name",
    names,
    sortedNames,
  );

  // 7. Test sorting by created_at (descending)
  const sortedByCreatedAtResult: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        sort: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(sortedByCreatedAtResult);

  // Verify topics are sorted by creation date (newest first)
  const createdAtTimestamps = sortedByCreatedAtResult.data.map((topic) =>
    new Date(topic.created_at).getTime(),
  );
  const isDescSorted = createdAtTimestamps.every(
    (val, i, arr) => i === 0 || val >= arr[i - 1],
  );
  TestValidator.predicate(
    "topics should be sorted by created_at in descending order",
    () => isDescSorted,
  );

  // 8. Test sorting by updated_at (descending)
  const sortedByUpdatedAtResult: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        sort: "updated_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(sortedByUpdatedAtResult);

  // Verify topics are sorted by update date (newest first)
  const updatedAtTimestamps = sortedByUpdatedAtResult.data.map((topic) =>
    new Date(topic.updated_at).getTime(),
  );
  const isUpdatedAtDescSorted = updatedAtTimestamps.every(
    (val, i, arr) => i === 0 || val >= arr[i - 1],
  );
  TestValidator.predicate(
    "topics should be sorted by updated_at in descending order",
    () => isUpdatedAtDescSorted,
  );

  // 9. Test corner cases: page=0 (should fail)
  await TestValidator.error("page number 0 should be rejected", async () => {
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        page: 0, // Invalid - must be >= 1
        limit: 10,
      } satisfies IEconomicBoardTopic.IRequest,
    });
  });

  // 10. Test corner cases: limit > 100 (should be capped to 100)
  const limitOver100Result: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        page: 1,
        limit: 150, // Beyond max limit - should be capped to 100
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(limitOver100Result);
  TestValidator.equals(
    "limit over 100 should be capped to 100",
    limitOver100Result.pagination.limit,
    100,
  );

  // 11. Test combining multiple filters: name + is_active
  const combinedSearchResult: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        name: "Tax", // Partial match
        is_active: true,
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(combinedSearchResult);

  // Verify results contain only active topics with "Tax" in name
  TestValidator.equals(
    "combined search should return exactly one result",
    combinedSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined search result should be 'Tax Policy'",
    combinedSearchResult.data[0].name,
    "Tax Policy",
  );
  TestValidator.predicate(
    "combined search result should be active",
    () => combinedSearchResult.data[0].is_active === true,
  );

  // 12. Test filtering only by limit (no pagination parameters)
  const limitOnlyResult: IPageIEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.search(connection, {
      body: {
        limit: 5, // Only specify limit
      } satisfies IEconomicBoardTopic.IRequest,
    });
  typia.assert(limitOnlyResult);

  TestValidator.equals(
    "limit-only search should return 5 topics",
    limitOnlyResult.data.length,
    5,
  );
  TestValidator.equals(
    "limit-only pagination should have limit of 5",
    limitOnlyResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "limit-only pagination should have page 1",
    limitOnlyResult.pagination.current,
    1,
  );
}
