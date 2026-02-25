import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the pagination system's performance and boundary conditions with large datasets
 * for the admin histories endpoint.
 *
 * This test validates that the histories endpoint handles pagination correctly across
 * different data volumes. After admin authentication, test:
 * 1) Limit parameter boundaries: minimum valid values (limit=1) and maximum (limit=100)
 * 2) Page navigation: verify that requesting page 1 with limit 10 returns correct records
 * 3) Last page behavior: when total records are not evenly divisible by limit
 * 4) Out-of-bounds pages: requesting a page beyond total pages should return empty data
 * 5) Performance with larger limits: verify that limit=100 returns up to 100 records
 */
export async function test_api_admin_histories_pagination_performance(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test minimum limit (1)
  const minLimitResponse =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          limit: 1 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.predicate(
    "minimum limit response has pagination",
    minLimitResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "minimum limit is 1",
    minLimitResponse.pagination.limit,
    1,
  );
  // Test maximum limit (100)
  const maxLimitResponse =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          limit: 100 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test page navigation with limit 10
  const page1Response =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 has correct page number",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 has correct limit",
    page1Response.pagination.limit,
    10,
  );
  // Test page 2
  const page2Response =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 2 satisfies number as number,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 has correct page number",
    page2Response.pagination.current,
    2,
  );
  // Test page 3
  const page3Response =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 3 satisfies number as number,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(page3Response);
  TestValidator.equals(
    "page 3 has correct page number",
    page3Response.pagination.current,
    3,
  );
  // Test out-of-bounds page (page beyond total pages)
  const totalRecords = page1Response.pagination.records;
  const totalPages = page1Response.pagination.pages;
  if (totalPages > 0) {
    const outOfBoundsPage = totalPages + 10;
    const outOfBoundsResponse =
      await api.functional.communityPlatform.admin.histories.index(
        adminConnection,
        {
          body: {
            limit: 10 satisfies number as number,
            page: outOfBoundsPage satisfies number as number,
          } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
        },
      );
    typia.assert(outOfBoundsResponse);
    TestValidator.equals(
      "out-of-bounds page returns empty data",
      outOfBoundsResponse.data.length,
      0,
    );
    TestValidator.equals(
      "out-of-bounds page has correct current page",
      outOfBoundsResponse.pagination.current,
      outOfBoundsPage,
    );
    TestValidator.equals(
      "out-of-bounds page maintains total records",
      outOfBoundsResponse.pagination.records,
      totalRecords,
    );
  }
  // Test last page behavior
  if (totalPages > 0) {
    const lastPageResponse =
      await api.functional.communityPlatform.admin.histories.index(
        adminConnection,
        {
          body: {
            limit: 10 satisfies number as number,
            page: totalPages satisfies number as number,
          } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
        },
      );
    typia.assert(lastPageResponse);
    TestValidator.equals(
      "last page has correct page number",
      lastPageResponse.pagination.current,
      totalPages,
    );
    // Verify last page has correct number of records (remaining records)
    const expectedLastPageRecords =
      totalRecords % 10 === 0 ? 10 : totalRecords % 10;
    TestValidator.predicate(
      "last page has valid number of records",
      lastPageResponse.data.length === expectedLastPageRecords ||
        (lastPageResponse.data.length === 0 && totalRecords === 0),
    );
  }
  // Test performance with limit 100
  const largeLimitResponse =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          limit: 100 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit is 100",
    largeLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large limit returns valid number of records",
    largeLimitResponse.data.length <= 100 &&
      largeLimitResponse.data.length >= 0,
  );
  // Validate pagination metadata consistency
  TestValidator.equals(
    "total records consistent across requests",
    page1Response.pagination.records,
    maxLimitResponse.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent across requests",
    page1Response.pagination.pages,
    maxLimitResponse.pagination.pages,
  );
}
