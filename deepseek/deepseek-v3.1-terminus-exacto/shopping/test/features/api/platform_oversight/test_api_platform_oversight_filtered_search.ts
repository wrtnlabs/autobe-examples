import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOversight";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_platform_oversight_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register a new super administrator using the utility function
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 3. Set up search parameters with oversight type filter and date range
  const oversightType: "health_check" | "compliance_audit" | "performance_review" | "security_scan" | "operational_assessment" = "security_scan";
  const currentDate = new Date();
  const oneMonthAgo = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const searchBody = {
    oversight_type: oversightType,
    created_after: oneMonthAgo.toISOString(),
    created_before: currentDate.toISOString(),
    page: 1 satisfies number as number,
    limit: 20 satisfies number as number,
  };
  // 4. Execute filtered search
  const response =
    await api.functional.ecommerce.superAdministrator.platform_oversight.index(
      superAdminConnection,
      { body: searchBody },
    );
  typia.assert(response);
  // 5. Validate pagination metadata (business logic)
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("page limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "non-negative records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("non-negative pages", response.pagination.pages >= 0);
  // Calculate expected pages based on records and limit
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "correct pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // 6. Validate that all returned records match the filter criteria (business logic)
  for (const record of response.data) {
    // typia.assert(record) already performed complete validation
    // Business logic: oversight type should match our filter
    TestValidator.equals(
      "oversight type filter match",
      record.oversight_type,
      oversightType,
    );
    // Business logic: dates should be within specified range
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      "created after specified date",
      createdAt >= oneMonthAgo,
    );
    TestValidator.predicate(
      "created before specified date",
      createdAt <= currentDate,
    );
  }
  // 7. Verify data is sorted by created_at descending (newest first) - business logic test
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].created_at);
      const currDate = new Date(response.data[i].created_at);
      TestValidator.predicate(
        `descending sort order check ${i}`,
        prevDate >= currDate,
      );
    }
  }
}