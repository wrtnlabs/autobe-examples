import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_platform_metrics_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Test first page with minimal filters
  const firstPageRequest: IEcommerceCacheConfigurationParameter.IRequest = {
    page: 1,
    limit: 10,
  };
  const firstPage =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      superAdminConnection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);
  // Step 3: Validate pagination metadata structure and relationships
  TestValidator.equals(
    "current page matches request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Validate pagination formula: pages = ceil(records / limit) or 0 if records = 0
  if (firstPage.pagination.records === 0) {
    TestValidator.equals(
      "zero records means zero pages",
      firstPage.pagination.pages,
      0,
    );
  } else {
    TestValidator.equals(
      "pages calculated correctly",
      firstPage.pagination.pages,
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    );
  }
  // Step 4: Validate data array structure
  if (firstPage.data.length > 0) {
    const sampleMetric = firstPage.data[0];
    typia.assert(sampleMetric);
    // Business logic validation (not type validation)
    TestValidator.predicate(
      "metric value is numeric",
      !isNaN(sampleMetric.metric_value),
    );
    // Validate timestamp is reasonable (not in the far future)
    const timestamp = new Date(sampleMetric.collection_timestamp);
    const now = new Date();
    const oneYearAgo = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
    );
    TestValidator.predicate(
      "collection timestamp is within reasonable range",
      timestamp <= now && timestamp >= oneYearAgo,
    );
  }
  // Step 5: Test second page if data exists
  if (firstPage.pagination.pages > 1) {
    const secondPageRequest: IEcommerceCacheConfigurationParameter.IRequest = {
      page: 2,
      limit: 10,
    };
    const secondPage =
      await api.functional.ecommerce.superAdministrator.platform_metrics.index(
        superAdminConnection,
        {
          body: secondPageRequest,
        },
      );
    typia.assert(secondPage);
    // Verify second page has correct pagination
    TestValidator.equals(
      "second page current page is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "total records consistent across pages",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "limit consistent across pages",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    // If both pages have data, verify they are different
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const firstPageIds = firstPage.data.map((item) => item.id);
      const secondPageIds = secondPage.data.map((item) => item.id);
      // Check that no ID appears on both pages (assuming unique IDs per metric)
      const intersection = firstPageIds.filter((id) =>
        secondPageIds.includes(id),
      );
      TestValidator.equals(
        "no overlapping IDs between first and second page",
        intersection.length,
        0,
      );
    }
  }
}
