import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_list_by_super_admin_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and register
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Call the admin list endpoint with empty (default) request body
  const result = await api.functional.shoppingMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("default limit is 20", result.pagination.limit, 20);
  TestValidator.predicate("records count >= 1", result.pagination.records >= 1);
  TestValidator.predicate("pages count >= 1", result.pagination.pages >= 1);
  // 4. Validate data array has at least one record
  TestValidator.predicate(
    "data array has at least one record",
    result.data.length >= 1,
  );
  // 5. Verify the registered super admin appears in the results with grade 'super'
  const found = result.data.find((admin) => admin.email === superAdmin.email);
  TestValidator.predicate(
    "registered super admin appears in results",
    found !== undefined,
  );
  if (found !== undefined) {
    TestValidator.equals("super admin has grade super", found.grade, "super");
    TestValidator.equals(
      "active super admin has null deleted_at",
      found.deleted_at,
      null,
    );
  }
}
