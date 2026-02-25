import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator account listing with grade filtering capability.
 *
 * This test validates:
 * 1. Grade filter accepts exact match values of 'regular' or 'super'
 * 2. When filtering by grade='regular', only regular administrators are returned
 * 3. When filtering by grade='super', only super administrators are returned
 * 4. The response structure remains consistent with pagination metadata
 * 5. Other admins with different grades are excluded from results when grade filter is applied
 */
export async function test_api_administrator_list_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create additional regular admins for test data
  await ArrayUtil.asyncRepeat(3, async () => {
    const tempConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(tempConnection, {});
  });
  // Test 1: Filter by 'regular' grade
  const regularResult = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: { grade: "regular" } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(regularResult);
  // Validate all returned admins have 'regular' grade
  TestValidator.predicate(
    "all admins with regular filter have regular grade",
    regularResult.data.every((admin) => admin.grade === "regular"),
  );
  // Validate at least one regular admin exists (we created some)
  TestValidator.predicate(
    "at least one regular admin exists",
    regularResult.data.length > 0,
  );
  // Test 2: Filter by 'super' grade
  const superResult = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: { grade: "super" } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(superResult);
  // Validate all returned admins have 'super' grade
  TestValidator.predicate(
    "all admins with super filter have super grade",
    superResult.data.every((admin) => admin.grade === "super"),
  );
  // Validate no regular admins appear in super filter results
  TestValidator.predicate(
    "no regular admins in super filter results",
    !superResult.data.some((admin) => admin.grade === "regular"),
  );
}
