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

export async function test_api_administrator_list_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for testing
  // Note: In test environment, the first administrator may have elevated privileges
  // or there may be a seeded super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // Create multiple regular administrators for testing grade filtering
  const regularAdmins = await ArrayUtil.asyncRepeat(3, async () => {
    const conn: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(conn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(admin);
    return admin;
  });
  // Test 1: Filter by grade='regular'
  const regularFilterResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      {
        body: {
          grade: "regular",
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(regularFilterResult);
  // Verify all returned administrators have grade='regular'
  TestValidator.predicate(
    "all returned admins have regular grade when filtered by regular",
    regularFilterResult.data.every((admin) => admin.grade === "regular"),
  );
  // Test 2: Filter by grade='super'
  const superFilterResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      {
        body: {
          grade: "super",
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(superFilterResult);
  // Verify all returned administrators have grade='super'
  TestValidator.predicate(
    "all returned admins have super grade when filtered by super",
    superFilterResult.data.every((admin) => admin.grade === "super"),
  );
  // Test 3: No grade filter (null/undefined) - should return all administrators
  const allAdminsResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(allAdminsResult);
  // Verify that unfiltered results include at least some regular administrators
  const hasRegularAdmins = allAdminsResult.data.some(
    (admin) => admin.grade === "regular",
  );
  TestValidator.predicate(
    "unfiltered results include regular admins",
    hasRegularAdmins,
  );
  // Test 4: Verify grade filter results are mutually exclusive
  // Regular filter results should not contain any super admins
  const regularIds = new Set(regularFilterResult.data.map((admin) => admin.id));
  const superAdminIds = new Set(
    superFilterResult.data.map((admin) => admin.id),
  );
  // Verify no overlap between regular and super filter results
  const regularFilterHasSuperAdmins = regularFilterResult.data.some((admin) =>
    superAdminIds.has(admin.id),
  );
  TestValidator.predicate(
    "regular filter results don't include super admins",
    !regularFilterHasSuperAdmins,
  );
  const superFilterHasRegularAdmins = superFilterResult.data.some((admin) =>
    regularIds.has(admin.id),
  );
  TestValidator.predicate(
    "super filter results don't include regular admins",
    !superFilterHasRegularAdmins,
  );
  // Test 5: Verify that our created regular admins appear in regular filter results
  const createdRegularIds = new Set(regularAdmins.map((admin) => admin.id));
  const regularFilterIncludesCreated = regularFilterResult.data.some((admin) =>
    createdRegularIds.has(admin.id),
  );
  TestValidator.predicate(
    "created regular admins appear in regular filter results",
    regularFilterIncludesCreated,
  );
}
