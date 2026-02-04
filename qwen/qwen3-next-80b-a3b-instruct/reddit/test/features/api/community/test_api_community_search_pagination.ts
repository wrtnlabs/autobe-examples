import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
export async function test_api_community_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for this test (no authorization needed)
  const guestConnection: api.IConnection = { host: connection.host };
  // Test 1: Get first page with limit=20
  const firstPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      guestConnection,
      {
        body: {
          sort: "new",
          limit: 20,
        },
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals(
    "first page should have limit 20",
    firstPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "first page should have between 0 and 20 items",
    firstPage.data.length >= 0 && firstPage.data.length <= 20,
  );
  TestValidator.equals(
    "first page should be page 1",
    firstPage.pagination.current,
    1,
  );
  // Test 2: Get second page with limit=20 and page=2
  const secondPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      guestConnection,
      {
        body: {
          sort: "new",
          limit: 20,
          page: 2,
        },
      },
    );
  typia.assert(secondPage);
  // Validate pagination metadata for second page
  TestValidator.equals(
    "second page should have limit 20",
    secondPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "second page should have between 0 and 20 items",
    secondPage.data.length >= 0 && secondPage.data.length <= 20,
  );
  TestValidator.equals(
    "second page should be page 2",
    secondPage.pagination.current,
    2,
  );
  // Validate pagination consistency
  TestValidator.predicate(
    "total records should be >= 0",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be >= 0",
    secondPage.pagination.pages >= 0,
  );
  // Validate data structure - community summary fields
  if (firstPage.data.length > 0) {
    const firstCommunity = firstPage.data[0];
    TestValidator.equals(
      "community name should be present",
      typeof firstCommunity.name,
      "string",
    );
    TestValidator.equals(
      "community description should be string",
      typeof firstCommunity.description,
      "string",
    );
    TestValidator.predicate(
      "description length should be <= 1000",
      firstCommunity.description.length <= 1000,
    );
    TestValidator.equals(
      "icon should be valid URI",
      typia.is<string & tags.Format<"uri">>(firstCommunity.icon),
      true,
    );
    TestValidator.equals(
      "subscriber_count should be positive integer",
      firstCommunity.subscriber_count >= 0,
      true,
    );
    TestValidator.equals(
      "created_at should be ISO date-time",
      typia.is<string & tags.Format<"date-time">>(firstCommunity.created_at),
      true,
    );
  }
  // Validate that items in data array are all community summaries
  firstPage.data.forEach((community) => {
    TestValidator.predicate(
      "all community items have correct structure",
      typeof community.name === "string" &&
        typeof community.description === "string" &&
        typia.is<string & tags.Format<"uri">>(community.icon) &&
        typeof community.subscriber_count === "number" &&
        typia.is<string & tags.Format<"date-time">>(community.created_at),
    );
  });
}
