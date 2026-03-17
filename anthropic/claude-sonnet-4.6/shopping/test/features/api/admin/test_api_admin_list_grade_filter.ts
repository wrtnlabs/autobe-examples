import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_list_grade_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular admin actor connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  const regularAdminId = adminAuth.id;
  // 2. Create a super admin actor connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 3. Filter by grade = 'regular'
  const regularList = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        grade: "regular",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(regularList);
  // All returned records must have grade 'regular'
  TestValidator.predicate(
    "all records in regular filter have grade=regular",
    () => regularList.data.every((admin) => admin.grade === "regular"),
  );
  // The newly joined regular admin must appear in the list
  TestValidator.predicate("regular admin appears in regular list", () =>
    regularList.data.some((admin) => admin.id === regularAdminId),
  );
  // 4. Filter by grade = 'super'
  const superList = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        grade: "super",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(superList);
  // All returned records must have grade 'super'
  TestValidator.predicate("all records in super filter have grade=super", () =>
    superList.data.every((admin) => admin.grade === "super"),
  );
  // The regular admin must NOT appear in the super list
  TestValidator.predicate(
    "regular admin does not appear in super list",
    () => !superList.data.some((admin) => admin.id === regularAdminId),
  );
  // 5. No grade filter - both grades may appear
  const allList = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(allList);
  // The regular admin should appear in the unfiltered list
  TestValidator.predicate("regular admin appears in unfiltered list", () =>
    allList.data.some((admin) => admin.id === regularAdminId),
  );
}
