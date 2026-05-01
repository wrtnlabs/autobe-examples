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
 * Test filtering administrator accounts by authority grade.
 *
 * Validates that the administrator listing endpoint correctly filters
 * results by grade. After authenticating as an administrator, the test
 * calls the endpoint with the grade filter set to 'super' and verifies
 * that only administrators with 'super' grade appear in the results.
 *
 * 1. Authenticate as an administrator using the join utility function.
 *    The new account is assigned 'regular' grade by default.
 * 2. Query the administrator listing with grade filter set to 'super'.
 * 3. Validate that all returned administrators have grade 'super'.
 * 4. Confirm the regular-grade administrator from step 1 does not appear
 *    in the filtered results, proving the filter excludes regular admins.
 */
export async function test_api_admin_list_filter_by_grade_super(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  const result = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        grade: "super",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate("all returned admins have super grade", () =>
    result.data.every((a) => a.grade === "super"),
  );
  TestValidator.predicate(
    "regular admin excluded from super-only results",
    () => !result.data.some((a) => a.id === admin.id),
  );
}
