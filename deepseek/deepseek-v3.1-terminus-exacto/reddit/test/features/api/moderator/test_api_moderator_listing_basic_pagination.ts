import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_moderator_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for making API calls
  const apiConnection: api.IConnection = { host: connection.host };
  // Test 1: First page with limit 5
  const firstPage = await api.functional.communityPlatform.moderators.index(
    apiConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination metadata exists",
    typeof firstPage.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate("limit is positive", firstPage.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals("data is array", Array.isArray(firstPage.data), true);
  // Calculate expected pages
  const expectedPages = Math.ceil(
    firstPage.pagination.records / firstPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation matches",
    firstPage.pagination.pages,
    expectedPages,
  );
  // Test 2: Second page with same limit
  if (firstPage.pagination.pages >= 2) {
    const secondPage = await api.functional.communityPlatform.moderators.index(
      apiConnection,
      {
        body: {
          page: 2,
          limit: firstPage.pagination.limit,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "same limit",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "same total records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "same total pages",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
  }
  // Test 3: Page beyond available data
  const largePage = await api.functional.communityPlatform.moderators.index(
    apiConnection,
    {
      body: {
        page: firstPage.pagination.pages + 10,
        limit: firstPage.pagination.limit,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(largePage);
  TestValidator.equals(
    "page beyond range has empty data",
    largePage.data.length,
    0,
  );
  TestValidator.equals(
    "current page matches request",
    largePage.pagination.current,
    firstPage.pagination.pages + 10,
  );
  TestValidator.equals(
    "limit matches",
    largePage.pagination.limit,
    firstPage.pagination.limit,
  );
  TestValidator.equals(
    "records unchanged",
    largePage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "pages unchanged",
    largePage.pagination.pages,
    firstPage.pagination.pages,
  );
  // Test 4: Default parameters (no page/limit specified)
  const defaultPage = await api.functional.communityPlatform.moderators.index(
    apiConnection,
    {
      body: {} satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page uses page 1",
    defaultPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "default limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(defaultPage.data));
  // Test 5: Different limit values
  const limit10 = await api.functional.communityPlatform.moderators.index(
    apiConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(limit10);
  TestValidator.equals("limit 10 applied", limit10.pagination.limit, 10);
  TestValidator.predicate("data length <= limit", limit10.data.length <= 10);
  const limit3 = await api.functional.communityPlatform.moderators.index(
    apiConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(limit3);
  TestValidator.equals("limit 3 applied", limit3.pagination.limit, 3);
  TestValidator.predicate("data length <= limit 3", limit3.data.length <= 3);
}
