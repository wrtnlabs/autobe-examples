import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOversight";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_platform_oversight_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as administrator using utility function
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!@#",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create search request with highly restrictive filters to ensure no results
  // Using a date far in the future (year 2100) to guarantee no matching records
  const distantFuture = new Date("2100-01-01T00:00:00Z").toISOString();
  const distantFuturePlusOneDay = new Date(
    "2100-01-02T00:00:00Z",
  ).toISOString();
  const searchRequest = {
    oversight_type:
      "security_scan" satisfies "security_scan" as "security_scan",
    severity_level: "critical" satisfies "critical" as "critical",
    resolved: false,
    created_after: distantFuture,
    created_before: distantFuturePlusOneDay,
    page: 1 satisfies number as number,
    limit: 20 satisfies number as number,
  } satisfies IEcommercePlatformOversight.IRequest;
  // Execute the platform oversight search
  const response =
    await api.functional.ecommerce.administrator.platform_oversight.index(
      adminConnection,
      {
        body: searchRequest,
      },
    );
  // Validate the response structure
  typia.assert(response);
  // Test pagination metadata for empty result set
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals(
    "total records should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero",
    response.pagination.pages,
    0,
  );
  // Test that data array is empty
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
