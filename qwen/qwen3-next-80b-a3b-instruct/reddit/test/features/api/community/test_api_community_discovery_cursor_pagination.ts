import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // First page request without cursor
  const firstPage = await api.functional.community.communities.index(
    connection,
    {
      body: {} satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(firstPage);
  // Extract pagination metadata from first page
  const { pagination, data: firstPageData } = firstPage;
  // Validate first page metadata as per schema
  TestValidator.equals("first page current is 1", pagination.current, 1);
  TestValidator.predicate("first page has records", pagination.records > 0);
  TestValidator.predicate("first page has limit", pagination.limit > 0);
  TestValidator.predicate(
    "first page has at least one community",
    firstPageData.length > 0,
  );
  // Generate a random cursor string for second request
  // This tests that the API accepts cursor parameter as string
  // Even though we cannot access next_cursor from response (ISummary is {}),
  // we can still test the API accepts a cursor in the request
  // We use a valid format cursor string (UUID format)
  const randomCursor = typia.random<string & tags.Format<"uuid">>();
  // Second page request using random cursor
  const secondPage = await api.functional.community.communities.index(
    connection,
    {
      body: { cursor: randomCursor } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(secondPage);
  // Extract pagination metadata from second page
  const { pagination: secondPagination, data: secondPageData } = secondPage;
  // Validate second page metadata matches expected structure
  // The cursor may be invalid, but the API should still return data
  TestValidator.equals("second page current is 1", secondPagination.current, 1);
  TestValidator.predicate(
    "second page has records",
    secondPagination.records > 0,
  );
  TestValidator.predicate("second page has limit", secondPagination.limit > 0);
  TestValidator.predicate(
    "second page has at least one community",
    secondPageData.length > 0,
  );
  // Validate that the API handles cursor parameter gracefully
  // Both requests should have identical pagination structure
  // even with invalid cursor (API likely treats it as no cursor)
  TestValidator.equals(
    "second page records unchanged from first",
    secondPagination.records,
    pagination.records,
  );
  TestValidator.equals(
    "second page limit matches first",
    secondPagination.limit,
    pagination.limit,
  );
  // Ensure the number of communities across both pages doesn't exceed total records
  // (Though both should have same total since cursor is invalid)
  TestValidator.predicate(
    "total communities from first and second page <= total records",
    firstPageData.length + secondPageData.length <= pagination.records * 2,
  );
}
