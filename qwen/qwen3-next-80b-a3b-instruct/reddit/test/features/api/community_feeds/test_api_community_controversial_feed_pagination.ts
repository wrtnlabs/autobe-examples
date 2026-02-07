import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_controversial_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for fetching first page of controversial feed
  const firstPageConnection: api.IConnection = { host: connection.host };
  // Fetch first page using default request (no page_token)
  const firstPageResponse =
    await api.functional.community.community_feeds.index(firstPageConnection, {
      body: {
        sort_algorithm: "controversial",
      } satisfies ICommunityPost.IRequest,
    });
  typia.assert(firstPageResponse);
  // Validate first page structure based on available properties
  TestValidator.equals(
    "first page has 20 items",
    firstPageResponse.data.length,
    20,
  );
  TestValidator.equals(
    "first page pagination limit is 20",
    firstPageResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "first page current page is 1",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page has records",
    () => firstPageResponse.pagination.records > 0,
  );
  // Create connection for fetching second page of controversial feed
  const secondPageConnection: api.IConnection = { host: connection.host };
  // Fetch second page using same sort algorithm
  const secondPageResponse =
    await api.functional.community.community_feeds.index(secondPageConnection, {
      body: {
        sort_algorithm: "controversial",
      } satisfies ICommunityPost.IRequest,
    });
  typia.assert(secondPageResponse);
  // Validate second page structure
  TestValidator.equals(
    "second page has 20 items",
    secondPageResponse.data.length,
    20,
  );
  TestValidator.equals(
    "second page pagination limit is 20",
    secondPageResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "second page current page is 1",
    secondPageResponse.pagination.current,
    1,
  );
  // Verify we have different data by comparing first item of first page with first item of second page
  // Since ICommunityPost.ISummary is {} but they are still different objects (different references)
  // We can't validate any fields, but we can test that arrays are not the same reference
  TestValidator.notEquals(
    "second page first item is different object from first page first item",
    secondPageResponse.data[0],
    firstPageResponse.data[0],
  );
}
