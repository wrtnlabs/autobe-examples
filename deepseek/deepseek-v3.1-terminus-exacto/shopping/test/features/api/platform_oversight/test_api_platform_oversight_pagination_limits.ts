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

/**
 * Test pagination functionality for platform oversight search endpoint.
 *
 * Validates various pagination scenarios including single records per page,
 * maximum limit (100), default behavior, and multi-page navigation.
 * Also tests edge cases like zero results and requesting pages beyond total count.
 */
export async function test_api_platform_oversight_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
    },
  });
  // 2. Test single record per page
  const singlePageBody = {
    limit: 1 satisfies number as number,
    page: 1 satisfies number as number,
  } satisfies IEcommercePlatformOversight.IRequest;
  const singlePageResult =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      { body: singlePageBody },
    );
  typia.assert(singlePageResult);
  // Validate pagination metadata
  TestValidator.equals(
    "single page limit should be 1",
    singlePageResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "single page current should be 1",
    singlePageResult.pagination.current,
    1,
  );
  // 3. Test maximum page limit (100)
  const maxLimitBody = {
    limit: 100 satisfies number as number,
    page: 1 satisfies number as number,
  } satisfies IEcommercePlatformOversight.IRequest;
  const maxLimitResult =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      { body: maxLimitBody },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit should be 100",
    maxLimitResult.pagination.limit,
    100,
  );
  // 4. Test default pagination (no limit specified)
  const defaultBody = {} satisfies IEcommercePlatformOversight.IRequest;
  const defaultResult =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      { body: defaultBody },
    );
  typia.assert(defaultResult);
  // 5. Test page beyond total count (empty result expected)
  const beyondPage =
    Math.max(
      singlePageResult.pagination.pages,
      defaultResult.pagination.pages,
    ) + 10;
  const beyondBody = {
    page: beyondPage satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IEcommercePlatformOversight.IRequest;
  const beyondResult =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      { body: beyondBody },
    );
  typia.assert(beyondResult);
  TestValidator.equals(
    "page beyond total should have correct current page",
    beyondResult.pagination.current,
    beyondPage,
  );
  // 6. Test multi-page navigation
  const multiPageBody = {
    page: 2 satisfies number as number,
    limit: 5 satisfies number as number,
  } satisfies IEcommercePlatformOversight.IRequest;
  const multiPageResult =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      { body: multiPageBody },
    );
  typia.assert(multiPageResult);
  // Validate pagination calculations
  TestValidator.equals(
    "multi-page current should be 2",
    multiPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "multi-page limit should be 5",
    multiPageResult.pagination.limit,
    5,
  );
  // Calculate expected pages (handle zero records case)
  const expectedPages =
    multiPageResult.pagination.records > 0
      ? Math.ceil(
          multiPageResult.pagination.records / multiPageResult.pagination.limit,
        )
      : 0;
  TestValidator.equals(
    "total pages calculation should be correct",
    multiPageResult.pagination.pages,
    expectedPages,
  );
  // 7. Test zero-result scenario with specific filter
  const zeroBody = {
    oversight_type: "health_check",
    severity_level: "emergency",
    resolved: false,
    created_after: typia.random<string & tags.Format<"date-time">>(),
  } satisfies IEcommercePlatformOversight.IRequest;
  const zeroResult =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      { body: zeroBody },
    );
  typia.assert(zeroResult);
  TestValidator.equals(
    "zero-result filter should have zero records",
    zeroResult.pagination.records,
    0,
  );
}
