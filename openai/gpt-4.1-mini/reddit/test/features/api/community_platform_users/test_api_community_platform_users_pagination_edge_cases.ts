import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_users_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create an initial request to get total records and pages with a small limit
  const initialLimit = 10 as const;
  const initialResponse = await api.functional.communityPlatform.users.index(
    { host: connection.host },
    {
      body: {
        page: 1,
        limit: initialLimit,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(initialResponse);
  // Calculate an out-of-range page number beyond the available pages
  const outOfRangePage = initialResponse.pagination.pages + 1;
  // Set the maximum allowed limit (100)
  const maxLimit = 100 as const;
  // Request with out-of-range page and max limit
  const edgeCaseResponse = await api.functional.communityPlatform.users.index(
    { host: connection.host },
    {
      body: {
        page: outOfRangePage,
        limit: maxLimit,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(edgeCaseResponse);
  // The data array should be empty for out-of-range page
  TestValidator.equals(
    "empty data for out-of-range page",
    edgeCaseResponse.data.length,
    0,
  );
  // The pagination metadata
  const pagination = edgeCaseResponse.pagination;
  // Validate pagination current page matches request page
  TestValidator.equals(
    "pagination current page",
    pagination.current,
    outOfRangePage,
  );
  // Validate pagination limit matches request limit
  TestValidator.equals("pagination limit", pagination.limit, maxLimit);
  // Validate pages field is consistent with initial response
  TestValidator.equals(
    "pagination total pages",
    pagination.pages,
    initialResponse.pagination.pages,
  );
  // Validate total record count remains unchanged
  TestValidator.equals(
    "pagination total records",
    pagination.records,
    initialResponse.pagination.records,
  );
}
