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

export async function test_api_communities_popular_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test default pagination (no parameters)
  const defaultResponse =
    await api.functional.communityPlatform.communities.popular.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Test explicit pagination parameters
  const page2Response =
    await api.functional.communityPlatform.communities.popular.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata values
  TestValidator.equals(
    "current page matches",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("limit matches", page2Response.pagination.limit, 5);
  TestValidator.predicate(
    "records is non-negative",
    page2Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    page2Response.pagination.pages >= 0,
  );
  // Test different limit values
  const limit10Response =
    await api.functional.communityPlatform.communities.popular.index(
      connection,
      {
        body: {
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(limit10Response);
  TestValidator.equals(
    "limit 10 matches",
    limit10Response.pagination.limit,
    10,
  );
  // Test sorting by subscriber_count
  const sortedResponse =
    await api.functional.communityPlatform.communities.popular.index(
      connection,
      {
        body: {
          sort: "subscriber_count",
          limit: 3,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Test pagination calculations
  if (
    defaultResponse.pagination.records > 0 &&
    defaultResponse.pagination.limit > 0
  ) {
    const expectedPages = Math.ceil(
      defaultResponse.pagination.records / defaultResponse.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      defaultResponse.pagination.pages,
      expectedPages,
    );
  }
  // Test page 1 with small limit
  const page1Response =
    await api.functional.communityPlatform.communities.popular.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 2);
}
