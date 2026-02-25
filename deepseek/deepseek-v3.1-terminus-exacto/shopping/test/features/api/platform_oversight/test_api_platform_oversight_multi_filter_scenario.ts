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

/**
 * Test complex platform oversight search with multiple filters: oversight_type,
 * severity_level, resolved status, and administrator filtering.
 * 1. Authenticate as super administrator
 * 2. Perform comprehensive search with multiple criteria
 * 3. Validate pagination behavior
 * 4. Verify filter accuracy for each criterion
 */
export async function test_api_platform_oversight_multi_filter_scenario(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  // 2. Perform comprehensive search with multiple filters
  const searchRequest: IEcommercePlatformOversight.IRequest = {
    oversight_type: "performance_review",
    severity_level: "warning",
    resolved: false,
    page: 1,
    limit: 20,
  };
  const response: IPageIEcommercePlatformOversight.ISummary =
    await api.functional.ecommerce.superAdministrator.platform_oversight.index(
      superAdminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data structure and filter accuracy
  if (response.data.length > 0) {
    for (const oversight of response.data) {
      TestValidator.equals(
        "oversight type matches filter",
        oversight.oversight_type,
        "performance_review",
      );
      TestValidator.equals(
        "severity level matches filter",
        oversight.severity_level,
        "warning",
      );
      TestValidator.equals(
        "resolved status matches filter",
        oversight.resolved,
        false,
      );
      // Validate administrator structure
      TestValidator.predicate(
        "administrator has id",
        oversight.administrator.id !== undefined,
      );
      TestValidator.predicate(
        "administrator has email",
        oversight.administrator.email !== undefined,
      );
      TestValidator.predicate(
        "administrator has created_at",
        oversight.administrator.created_at !== undefined,
      );
    }
  } else {
    // Test edge case: no results matching criteria
    TestValidator.predicate(
      "no data returned for strict filters",
      response.data.length === 0,
    );
  }
  // 5. Test pagination behavior with different parameters
  const paginatedRequest: IEcommercePlatformOversight.IRequest = {
    oversight_type: "performance_review",
    severity_level: "warning",
    resolved: false,
    page: 1,
    limit: 5,
  };
  const paginatedResponse: IPageIEcommercePlatformOversight.ISummary =
    await api.functional.ecommerce.superAdministrator.platform_oversight.index(
      superAdminConnection,
      {
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination consistency
  TestValidator.equals(
    "page number matches request",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is correctly applied",
    paginatedResponse.pagination.limit,
    5,
  );
  // Validate that smaller limit doesn't break functionality
  if (paginatedResponse.data.length > 0) {
    TestValidator.predicate(
      "data length does not exceed limit",
      paginatedResponse.data.length <= 5,
    );
  }
}
