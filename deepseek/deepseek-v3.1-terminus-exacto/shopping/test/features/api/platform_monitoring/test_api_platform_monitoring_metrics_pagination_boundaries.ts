import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test pagination behavior including edge cases for platform monitoring metrics.
 * Authenticate as administrator and test various pagination configurations:
 * - First page (page=1) with different limit values
 * - Last page (page=pagination.pages) with varying result counts
 * - Edge cases like page=0, negative pages, out-of-bounds pages
 * - Different page limits within valid range (1-100)
 * - Validate pagination metadata accuracy
 */
export async function test_api_platform_monitoring_metrics_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Test first page with various limits
  const limits = [1, 10, 25, 50, 100] as const;
  for (const limit of limits) {
    const firstPage =
      await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceCacheConfigurationParameter.IRequest,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata for first page
    TestValidator.equals(
      `first page current should be 1 with limit ${limit}`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `first page limit should match request ${limit}`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `records should be >= 0 with limit ${limit}`,
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pages should be >= 0 with limit ${limit}`,
      firstPage.pagination.pages >= 0,
    );
    // Validate data length (should be <= limit, could be empty)
    TestValidator.predicate(
      `data length <= limit ${limit}`,
      firstPage.data.length <= limit,
    );
  }
  // 3. Test last page behavior
  const baseResponse =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(baseResponse);
  if (baseResponse.pagination.pages > 0) {
    const lastPage =
      await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
        adminConnection,
        {
          body: {
            page: baseResponse.pagination.pages,
            limit: 10 satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceCacheConfigurationParameter.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current should match requested page",
      lastPage.pagination.current,
      baseResponse.pagination.pages,
    );
    TestValidator.equals(
      "last page limit should be 10",
      lastPage.pagination.limit,
      10,
    );
    TestValidator.equals(
      "last page total records should match",
      lastPage.pagination.records,
      baseResponse.pagination.records,
    );
    TestValidator.equals(
      "last page total pages should match",
      lastPage.pagination.pages,
      baseResponse.pagination.pages,
    );
    // Last page data length should be <= limit
    TestValidator.predicate(
      "last page data length <= limit",
      lastPage.data.length <= 10,
    );
  }
  // 4. Test edge cases
  // Test page 0 (should default to page 1 or handle gracefully)
  await TestValidator.error("page=0 should be invalid", async () => {
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          page: 0 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  });
  // Test page beyond total pages
  if (baseResponse.pagination.pages > 0) {
    const beyondPage =
      await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
        adminConnection,
        {
          body: {
            page: (baseResponse.pagination.pages +
              1) satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            limit: 10 satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceCacheConfigurationParameter.IRequest,
        },
      );
    typia.assert(beyondPage);
    // Should return empty data array when page is beyond total
    if (beyondPage.pagination.current > beyondPage.pagination.pages) {
      TestValidator.equals(
        "beyond page data should be empty",
        beyondPage.data.length,
        0,
      );
    }
  }
  // Test minimum valid limit
  const minLimitResponse =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit should be 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length with limit=1 should be <= 1",
    minLimitResponse.data.length <= 1,
  );
  // Test maximum valid limit
  const maxLimitResponse =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length with limit=100 should be <= 100",
    maxLimitResponse.data.length <= 100,
  );
  // Test invalid limit (>100)
  await TestValidator.error("limit >100 should be invalid", async () => {
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 101 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  });
  // Test invalid limit (<=0)
  await TestValidator.error("limit <=0 should be invalid", async () => {
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 0 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  });
  // 5. Validate pagination consistency across multiple pages
  if (baseResponse.pagination.pages >= 2) {
    let allRecords: IEcommerceCacheConfigurationParameter.ISummary[] = [];
    for (let page = 1; page <= baseResponse.pagination.pages; page++) {
      const pageResponse =
        await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
          adminConnection,
          {
            body: {
              page: page satisfies number as number &
                tags.Type<"int32"> &
                tags.Minimum<1>,
              limit: 10 satisfies number as number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100>,
            } satisfies IEcommerceCacheConfigurationParameter.IRequest,
          },
        );
      typia.assert(pageResponse);
      TestValidator.equals(
        `page ${page} current should match`,
        pageResponse.pagination.current,
        page,
      );
      TestValidator.equals(
        `page ${page} records total should be consistent`,
        pageResponse.pagination.records,
        baseResponse.pagination.records,
      );
      allRecords = allRecords.concat(pageResponse.data);
    }
    // Validate total records match sum of all page data
    TestValidator.equals(
      "total records should equal sum of all page data",
      baseResponse.pagination.records,
      allRecords.length,
    );
  }
}
