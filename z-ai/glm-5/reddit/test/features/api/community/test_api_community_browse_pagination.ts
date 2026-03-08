import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_browse_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default pagination - call without any parameters
  const defaultResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(defaultResponse);
  // Validate default values (business logic, not type checks)
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  // 2. Test custom pagination - page 1 with limit 5
  const customLimit = 5;
  const page1Response =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: customLimit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(page1Response);
  // Validate pagination parameters are respected
  TestValidator.equals("requested page 1", page1Response.pagination.current, 1);
  TestValidator.equals(
    "requested limit",
    page1Response.pagination.limit,
    customLimit,
  );
  // Validate data array size
  if (page1Response.pagination.records >= customLimit) {
    TestValidator.equals(
      "data length matches limit",
      page1Response.data.length,
      customLimit,
    );
  } else {
    TestValidator.equals(
      "data length matches total records",
      page1Response.data.length,
      page1Response.pagination.records,
    );
  }
  // 3. Test page navigation - request page 2
  const totalPages = page1Response.pagination.pages;
  if (totalPages >= 2) {
    const page2Response =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          page: 2,
          limit: customLimit,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(page2Response);
    // Validate page navigation
    TestValidator.equals(
      "current page is 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals(
      "limit remains same",
      page2Response.pagination.limit,
      customLimit,
    );
    // Validate records count is consistent
    TestValidator.equals(
      "total records consistent",
      page2Response.pagination.records,
      page1Response.pagination.records,
    );
    TestValidator.equals(
      "total pages consistent",
      page2Response.pagination.pages,
      totalPages,
    );
  }
  // 4. Validate pagination metadata accuracy
  const expectedPages = Math.ceil(
    page1Response.pagination.records / customLimit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    page1Response.pagination.pages,
    expectedPages,
  );
  // 5. Test different limit values
  const smallerLimit = 3;
  const smallLimitResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: smallerLimit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "smaller limit applied",
    smallLimitResponse.pagination.limit,
    smallerLimit,
  );
  if (smallLimitResponse.pagination.records >= smallerLimit) {
    TestValidator.equals(
      "data length with smaller limit",
      smallLimitResponse.data.length,
      smallerLimit,
    );
  }
  // Validate records count consistency across different limit requests
  TestValidator.equals(
    "records count consistent across requests",
    smallLimitResponse.pagination.records,
    page1Response.pagination.records,
  );
}
