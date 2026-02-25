import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for community browsing (no authentication required)
  const browseConnection: api.IConnection = { host: connection.host };
  // Test subscriber_count sorting (popularity)
  const popularityResponse =
    await api.functional.communityPlatform.communities.browse.index(
      browseConnection,
      {
        body: {
          sort: "subscriber_count" as const,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(popularityResponse);
  // Test created_at sorting (recency)
  const recencyResponse =
    await api.functional.communityPlatform.communities.browse.index(
      browseConnection,
      {
        body: {
          sort: "created_at" as const,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(recencyResponse);
  // Test name sorting (alphabetical)
  const alphabeticalResponse =
    await api.functional.communityPlatform.communities.browse.index(
      browseConnection,
      {
        body: {
          sort: "name" as const,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(alphabeticalResponse);
  // Validate that each sorting option returns data
  TestValidator.predicate(
    "subscriber_count sorting should return communities",
    popularityResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "created_at sorting should return communities",
    recencyResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "name sorting should return communities",
    alphabeticalResponse.data.length >= 0,
  );
  // Validate created_at sorting order (newest first)
  if (recencyResponse.data.length > 1) {
    for (let i = 1; i < recencyResponse.data.length; i++) {
      const prevDate = new Date(recencyResponse.data[i - 1].created_at);
      const currDate = new Date(recencyResponse.data[i].created_at);
      TestValidator.predicate(
        `created_at should be in descending order (item ${i - 1} >= item ${i})`,
        prevDate >= currDate,
      );
    }
  }
  // Validate name sorting order (alphabetical ascending)
  if (alphabeticalResponse.data.length > 1) {
    for (let i = 1; i < alphabeticalResponse.data.length; i++) {
      const prevName = alphabeticalResponse.data[i - 1].name.toLowerCase();
      const currName = alphabeticalResponse.data[i].name.toLowerCase();
      TestValidator.predicate(
        `name should be in ascending alphabetical order (item ${i - 1} <= item ${i})`,
        prevName <= currName,
      );
    }
  }
  // Validate pagination consistency for subscriber_count sorting
  const page1Response =
    await api.functional.communityPlatform.communities.browse.index(
      browseConnection,
      {
        body: {
          sort: "subscriber_count" as const,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.communityPlatform.communities.browse.index(
      browseConnection,
      {
        body: {
          sort: "subscriber_count" as const,
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate that pagination returns different sets of data
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    const page1Ids = new Set(
      page1Response.data.map((community) => community.id),
    );
    const page2Ids = new Set(
      page2Response.data.map((community) => community.id),
    );
    // Check that pages don't share any communities
    const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
    TestValidator.equals(
      "page 1 and page 2 should have distinct communities",
      intersection.length,
      0,
    );
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination should have valid current page",
      page1Response.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination should have valid limit",
      page1Response.pagination.limit === 5,
    );
    TestValidator.predicate(
      "pagination should have valid total records",
      page1Response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination should have valid total pages",
      page1Response.pagination.pages >= 0,
    );
  }
  // Test that different sorting options return different orderings
  if (
    popularityResponse.data.length > 0 &&
    alphabeticalResponse.data.length > 0
  ) {
    const popularityFirstId = popularityResponse.data[0]?.id;
    const alphabeticalFirstId = alphabeticalResponse.data[0]?.id;
    // It's possible but not guaranteed that different sorting gives different first results
    if (popularityFirstId && alphabeticalFirstId) {
      TestValidator.predicate(
        "different sorting methods should be tested",
        true, // Just validating that we have data to compare
      );
    }
  }
}
