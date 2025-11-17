import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

/**
 * Validate the retrieving of a filtered and paginated list of reddit community
 * communities.
 *
 * This test covers:
 *
 * - Filtering by name (partial match)
 * - Filtering by title (partial match)
 * - Filtering by creation date range (from/to)
 * - Filtering active communities (deleted_at_is_null = true)
 * - Pagination behavior with page and limit
 * - Sorting behavior by name and created_at in both ascending and descending
 *   order
 *
 * No authentication is required as this endpoint is public.
 *
 * The test performs multiple calls with various filters and sorting options to
 * validate correct business rules are applied and pagination data is valid.
 */
export async function test_api_reddit_community_communities_search_pagination(
  connection: api.IConnection,
) {
  // Generate realistic time boundaries within last 10 days for filtering
  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const fromISO = tenDaysAgo.toISOString();
  const toISO = now.toISOString();

  // We will test multiple scenarios

  // 1. Test: Filtering by partial name with pagination and sorting by name ascending
  {
    const partialName = "com";
    const req = {
      name: partialName,
      page: 1,
      limit: 5,
      sort_by: "name",
      sort_order: "asc",
      deleted_at_is_null: true,
    } satisfies IRedditCommunityCommunity.IRequest;

    const res =
      await api.functional.redditCommunity.redditCommunity.communities.index(
        connection,
        { body: req },
      );
    typia.assert(res);

    // Validate pagination fields
    TestValidator.predicate(
      "pagination current page is 1",
      res.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is 5",
      res.pagination.limit === 5,
    );
    TestValidator.predicate(
      "pagination pages are at least 1",
      res.pagination.pages >= 1,
    );
    TestValidator.predicate(
      "pagination records is >= data length",
      res.pagination.records >= res.data.length,
    );

    // Check all communities match filter: name includes partialName case-insensitive
    for (const community of res.data) {
      TestValidator.predicate(
        `community name '${community.name}' includes partial '${partialName}'`,
        community.name.toLowerCase().includes(partialName),
      );
      // Filter active only
      TestValidator.predicate(
        `community deleted_at_is_null is true`,
        community.deleted_at === null || community.deleted_at === undefined,
      );
    }

    // Validate sorting ascending by name
    for (let i = 1; i < res.data.length; ++i) {
      TestValidator.predicate(
        `communities[${i - 1}].name <= communities[${i}].name sorted ascending`,
        res.data[i - 1].name.localeCompare(res.data[i].name) <= 0,
      );
    }
  }

  // 2. Test: Filtering by partial title with pagination and sorting by created_at descending
  {
    const partialTitle = "community";
    const req = {
      title: partialTitle,
      page: 1,
      limit: 3,
      sort_by: "created_at",
      sort_order: "desc",
      deleted_at_is_null: true,
    } satisfies IRedditCommunityCommunity.IRequest;

    const res =
      await api.functional.redditCommunity.redditCommunity.communities.index(
        connection,
        { body: req },
      );
    typia.assert(res);

    TestValidator.predicate(
      "pagination current page is 1",
      res.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is 3",
      res.pagination.limit === 3,
    );

    // Check all communities match filter: title includes partialTitle case-insensitive
    for (const community of res.data) {
      TestValidator.predicate(
        `community title '${community.title}' includes partial '${partialTitle}'`,
        community.title.toLowerCase().includes(partialTitle),
      );
      TestValidator.predicate(
        `community deleted_at_is_null is true`,
        community.deleted_at === null || community.deleted_at === undefined,
      );
    }

    // Validate sorting descending by created_at
    for (let i = 1; i < res.data.length; ++i) {
      TestValidator.predicate(
        `communities[${i - 1}].created_at >= communities[${i}].created_at sorted descending`,
        res.data[i - 1].created_at >= res.data[i].created_at,
      );
    }
  }

  // 3. Test: Filtering by creation date range
  {
    const req = {
      created_at_from: fromISO,
      created_at_to: toISO,
      page: 1,
      limit: 10,
      deleted_at_is_null: true,
    } satisfies IRedditCommunityCommunity.IRequest;

    const res =
      await api.functional.redditCommunity.redditCommunity.communities.index(
        connection,
        { body: req },
      );
    typia.assert(res);

    // Check date range filtering
    for (const community of res.data) {
      TestValidator.predicate(
        `community created_at >= created_at_from`,
        community.created_at >= fromISO,
      );
      TestValidator.predicate(
        `community created_at <= created_at_to`,
        community.created_at <= toISO,
      );
      TestValidator.predicate(
        `community deleted_at_is_null is true`,
        community.deleted_at === null || community.deleted_at === undefined,
      );
    }
  }

  // 4. Test: Filtering active communities only (deleted_at_is_null true) and check pagination on page 2
  {
    const req = {
      deleted_at_is_null: true,
      page: 2,
      limit: 4,
    } satisfies IRedditCommunityCommunity.IRequest;

    const res =
      await api.functional.redditCommunity.redditCommunity.communities.index(
        connection,
        { body: req },
      );
    typia.assert(res);

    // Validate page number and limit
    TestValidator.equals(
      "pagination current page is 2",
      res.pagination.current,
      2,
    );
    TestValidator.equals("pagination limit is 4", res.pagination.limit, 4);

    // Validate communities are active
    for (const community of res.data) {
      TestValidator.predicate(
        `community deleted_at_is_null is true`,
        community.deleted_at === null || community.deleted_at === undefined,
      );
    }
  }

  // 5. Test: Sorting by name descending, no filters, page 1, limit 5
  {
    const req = {
      page: 1,
      limit: 5,
      sort_by: "name",
      sort_order: "desc",
    } satisfies IRedditCommunityCommunity.IRequest;

    const res =
      await api.functional.redditCommunity.redditCommunity.communities.index(
        connection,
        { body: req },
      );
    typia.assert(res);

    // Validate pagination
    TestValidator.equals(
      "pagination current page is 1",
      res.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit is 5", res.pagination.limit, 5);

    // Validate sorting descending by name
    for (let i = 1; i < res.data.length; ++i) {
      TestValidator.predicate(
        `communities[${i - 1}].name >= communities[${i}].name sorted descending`,
        res.data[i - 1].name.localeCompare(res.data[i].name) >= 0,
      );
    }
  }
}
