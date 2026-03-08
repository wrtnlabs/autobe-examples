import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that a regular administrator is denied access to the administrator list endpoint.
 *
 * Business Rule: Only super administrators can access this endpoint.
 * Regular administrators should receive authorization denial.
 */
export async function test_api_administrator_list_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new regular administrator (grade='regular' by default)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(regularAdminConnection, {});
  typia.assert(admin);
  // 2. Verify the administrator is created with 'regular' grade
  TestValidator.equals(
    "administrator grade should be regular",
    admin.grade,
    "regular",
  );
  // 3. Attempt to access administrator list with regular administrator
  // Should receive 403 Forbidden since only super administrators can access this endpoint
  await TestValidator.httpError(
    "regular admin cannot access administrator list",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.index(
        regularAdminConnection,
        { body: {} satisfies IShoppingMallAdministrator.IRequest },
      );
    },
  );
}
