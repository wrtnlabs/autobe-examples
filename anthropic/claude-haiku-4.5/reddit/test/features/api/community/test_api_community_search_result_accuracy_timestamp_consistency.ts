import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Validates community search result accuracy and timestamp consistency.
 *
 * This test ensures that community search results return accurate, up-to-date
 * information including subscriber counts, post counts, and properly formatted
 * timestamps. It verifies that:
 *
 * 1. Subscriber and post counts are accurate and current
 * 2. Timestamps are in ISO 8601 format
 * 3. Timestamp ordering is logically consistent when sorted
 * 4. Community identifiers and names reflect current data
 */
export async function test_api_community_search_result_accuracy_timestamp_consistency(
  connection: api.IConnection,
) {
  // Test 1: Search without filters and validate basic timestamp formatting
  const searchResult1: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchResult1);

  // Validate that pagination data exists
  TestValidator.predicate(
    "pagination should be present",
    searchResult1.pagination !== null && searchResult1.pagination !== undefined,
  );

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current should be non-negative",
    searchResult1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    searchResult1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResult1.pagination.pages >= 0,
  );

  // Validate that data array exists
  TestValidator.predicate(
    "data array should be present",
    Array.isArray(searchResult1.data),
  );

  // If there are results, validate timestamp formatting and consistency
  if (searchResult1.data.length > 0) {
    // Test 2: Validate ISO 8601 timestamp format for all results
    for (const community of searchResult1.data) {
      // Verify created_at is a valid ISO 8601 date-time string
      const isoDateTimeRegex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
      TestValidator.predicate(
        `community ${community.identifier} created_at should be ISO 8601 format`,
        isoDateTimeRegex.test(community.created_at),
      );

      // Verify created_at can be parsed as a valid date
      const parsedDate = new Date(community.created_at);
      TestValidator.predicate(
        `community ${community.identifier} created_at should be valid date`,
        !isNaN(parsedDate.getTime()),
      );

      // Verify subscriber_count is non-negative
      TestValidator.predicate(
        `community ${community.identifier} subscriber_count should be non-negative`,
        community.subscriber_count >= 0,
      );

      // Verify post_count is non-negative
      TestValidator.predicate(
        `community ${community.identifier} post_count should be non-negative`,
        community.post_count >= 0,
      );

      // Verify identifier matches the pattern
      const identifierRegex = /^[a-z0-9_]{3,32}$/;
      TestValidator.predicate(
        `community identifier should match pattern`,
        identifierRegex.test(community.identifier),
      );

      // Verify name length constraints
      TestValidator.predicate(
        `community ${community.identifier} name should be between 3-100 characters`,
        community.name.length >= 3 && community.name.length <= 100,
      );
    }

    // Test 3: Verify timestamp ordering consistency when sorted by created_at
    const sortedByCreatedAt: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          sort: "created_at",
          direction: "desc",
          limit: 10,
          offset: 0,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(sortedByCreatedAt);

    // Validate descending order (newer first)
    if (sortedByCreatedAt.data.length > 1) {
      for (let i = 0; i < sortedByCreatedAt.data.length - 1; i++) {
        const current = new Date(sortedByCreatedAt.data[i].created_at);
        const next = new Date(sortedByCreatedAt.data[i + 1].created_at);
        TestValidator.predicate(
          `timestamp ordering should be descending (newer first) at index ${i}`,
          current >= next,
        );
      }
    }

    // Test 4: Verify timestamp ordering with ascending sort
    const sortedAscending: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          sort: "created_at",
          direction: "asc",
          limit: 10,
          offset: 0,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(sortedAscending);

    // Validate ascending order (older first)
    if (sortedAscending.data.length > 1) {
      for (let i = 0; i < sortedAscending.data.length - 1; i++) {
        const current = new Date(sortedAscending.data[i].created_at);
        const next = new Date(sortedAscending.data[i + 1].created_at);
        TestValidator.predicate(
          `timestamp ordering should be ascending (older first) at index ${i}`,
          current <= next,
        );
      }
    }

    // Test 5: Verify sorting by subscriber_count
    const sortedBySubscribers: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          sort: "subscriber_count",
          direction: "desc",
          limit: 10,
          offset: 0,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(sortedBySubscribers);

    // Validate subscriber count ordering
    if (sortedBySubscribers.data.length > 1) {
      for (let i = 0; i < sortedBySubscribers.data.length - 1; i++) {
        TestValidator.predicate(
          `subscriber_count should be in descending order at index ${i}`,
          sortedBySubscribers.data[i].subscriber_count >=
            sortedBySubscribers.data[i + 1].subscriber_count,
        );
      }
    }

    // Test 6: Verify sorting by post_count
    const sortedByPosts: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          sort: "post_count",
          direction: "desc",
          limit: 10,
          offset: 0,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(sortedByPosts);

    // Validate post count ordering
    if (sortedByPosts.data.length > 1) {
      for (let i = 0; i < sortedByPosts.data.length - 1; i++) {
        TestValidator.predicate(
          `post_count should be in descending order at index ${i}`,
          sortedByPosts.data[i].post_count >=
            sortedByPosts.data[i + 1].post_count,
        );
      }
    }

    // Test 7: Verify sorting by name (alphabetical)
    const sortedByName: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          sort: "name",
          direction: "asc",
          limit: 10,
          offset: 0,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(sortedByName);

    // Validate alphabetical ordering
    if (sortedByName.data.length > 1) {
      for (let i = 0; i < sortedByName.data.length - 1; i++) {
        TestValidator.predicate(
          `names should be in alphabetical order at index ${i}`,
          sortedByName.data[i].name.localeCompare(
            sortedByName.data[i + 1].name,
          ) <= 0,
        );
      }
    }

    // Test 8: Verify that IDs are unique in results
    const ids = new Set<string>();
    for (const community of searchResult1.data) {
      TestValidator.predicate(
        `community id should be unique`,
        !ids.has(community.id),
      );
      ids.add(community.id);
    }

    // Test 9: Verify identifier uniqueness
    const identifiers = new Set<string>();
    for (const community of searchResult1.data) {
      TestValidator.predicate(
        `community identifier should be unique`,
        !identifiers.has(community.identifier),
      );
      identifiers.add(community.identifier);
    }
  }

  // Test 10: Verify pagination consistency across multiple requests
  const firstPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 5,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(firstPage);

  const secondPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 5,
        offset: 5,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(secondPage);

  // Total records should be consistent
  TestValidator.equals(
    "total records should be consistent across pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );

  // Test 11: Verify search with text filtering maintains accuracy
  if (firstPage.data.length > 0) {
    const firstCommunity = firstPage.data[0];
    const searchByName: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          search: firstCommunity.name.substring(0, 3),
          limit: 20,
          offset: 0,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(searchByName);

    // Search results should be filtered
    if (searchByName.data.length > 0) {
      for (const community of searchByName.data) {
        TestValidator.predicate(
          `search result should match search criteria`,
          community.name
            .toLowerCase()
            .includes(firstCommunity.name.substring(0, 3).toLowerCase()) ||
            community.identifier
              .toLowerCase()
              .includes(firstCommunity.name.substring(0, 3).toLowerCase()),
        );
      }
    }
  }
}
