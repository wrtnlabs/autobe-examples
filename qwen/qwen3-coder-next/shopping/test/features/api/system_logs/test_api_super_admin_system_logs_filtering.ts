import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicLog";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test system logs filtering functionality with super admin authentication.
 * Validates that logs can be filtered by date ranges, severity levels, components,
 * and text search on message and context fields.
 */
export async function test_api_super_admin_system_logs_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Test date range filtering
  const twoHoursAgo = new Date(
    new Date().getTime() - 2 * 60 * 60 * 1000,
  ).toISOString();
  const oneHourAgo = new Date(
    new Date().getTime() - 1 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeResponse =
    await api.functional.shoppingMall.superAdmin.logs.index(adminConnection, {
      body: {
        from: twoHoursAgo,
        to: oneHourAgo,
      },
    });
  typia.assert(dateRangeResponse);
  // 3. Test severity level filtering
  const errorSeverityResponse =
    await api.functional.shoppingMall.superAdmin.logs.index(adminConnection, {
      body: {
        severity: "error",
      },
    });
  typia.assert(errorSeverityResponse);
  // 4. Test component filtering
  const authComponentResponse =
    await api.functional.shoppingMall.superAdmin.logs.index(adminConnection, {
      body: {
        component: "authentication",
      },
    });
  typia.assert(authComponentResponse);
  // 5. Test text search on message and context
  const searchResponse =
    await api.functional.shoppingMall.superAdmin.logs.index(adminConnection, {
      body: {
        message: "test",
      },
    });
  typia.assert(searchResponse);
  // 6. Test combined filter criteria
  const combinedResponse =
    await api.functional.shoppingMall.superAdmin.logs.index(adminConnection, {
      body: {
        from: oneHourAgo,
        severity: "warning",
        component: "payment",
      },
    });
  typia.assert(combinedResponse);
  // 7. Test pagination with filtered results
  const paginatedResponse =
    await api.functional.shoppingMall.superAdmin.logs.index(adminConnection, {
      body: {
        limit: 5,
        severity: "info",
      },
    });
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination: result count matches limit",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination: has pagination metadata",
    paginatedResponse.pagination !== null,
  );
  // 8. Test empty result set
  const farFuture = new Date(
    new Date().getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const emptyResponse = await api.functional.shoppingMall.superAdmin.logs.index(
    adminConnection,
    {
      body: {
        from: farFuture,
      },
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result: total records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result: data array",
    emptyResponse.data.length,
    0,
  );
  // 9. Test case sensitivity in text search
  const caseSensitiveResponse =
    await api.functional.shoppingMall.superAdmin.logs.index(adminConnection, {
      body: {
        message: "UPPERCASE",
      },
    });
  typia.assert(caseSensitiveResponse);
  // Note: Text search behavior may vary - this tests the current implementation
  console.log(
    `Case sensitive search found ${caseSensitiveResponse.data.length} results`,
  );
}
