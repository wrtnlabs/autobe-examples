import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering administrators by grade level and account status.
 *
 * Validates the administrator listing endpoint with various filter combinations including grade level (regular/super) and account status (active/banned/deleted). Creates multiple administrator accounts with different configurations and verifies that filtering returns the correct subset of administrators.
 *
 * Special attention is given to verifying that the grade field correctly distinguishes between regular and super administrators, and that status computation from deleted_at and banned_at fields works correctly for active administrators.
 *
 * 1. Create super administrator account for authentication.
 * 2. Create additional administrators with different grade levels.
 * 3. Test filtering by grade='super' to verify only super administrators returned.
 * 4. Test filtering by grade='regular' to verify only regular administrators returned.
 * 5. Test filtering by status='active' to verify active administrators only.
 * 6. Validate pagination metadata and member profile information in results.
 */
export async function test_api_administrator_filter_by_grade_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "super",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Create another super administrator for testing
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_admin_join(superAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "super",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  // 4. Test filtering by grade='super'
  const superOnlyResult =
    await api.functional.shoppingMall.admin.administrators.index(
      superAdminConnection,
      {
        body: {
          grade: "super",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(superOnlyResult);
  // Validate all returned administrators are super grade
  TestValidator.predicate(
    "all filtered admins are super grade",
    superOnlyResult.data.every((admin) => admin.grade === "super"),
  );
  TestValidator.predicate(
    "super filter returns at least 2 admins",
    superOnlyResult.data.length >= 2,
  );
  // 5. Test filtering by grade='regular'
  const regularOnlyResult =
    await api.functional.shoppingMall.admin.administrators.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(regularOnlyResult);
  // Validate all returned administrators are regular grade
  TestValidator.predicate(
    "all filtered admins are regular grade",
    regularOnlyResult.data.every((admin) => admin.grade === "regular"),
  );
  TestValidator.predicate(
    "regular filter returns at least 1 admin",
    regularOnlyResult.data.length >= 1,
  );
  // 6. Test filtering by status='active' without grade filter
  const activeOnlyResult =
    await api.functional.shoppingMall.admin.administrators.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(activeOnlyResult);
  // Validate all returned administrators are active
  TestValidator.predicate(
    "all filtered admins are active status",
    activeOnlyResult.data.every((admin) => admin.member.status === "active"),
  );
  TestValidator.predicate(
    "active filter returns at least 3 admins",
    activeOnlyResult.data.length >= 3,
  );
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    superOnlyResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    superOnlyResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    superOnlyResult.pagination.records >= 2,
  );
  // 8. Validate member profile information exists
  const firstSuperAdmin = superOnlyResult.data[0];
  TestValidator.predicate(
    "admin has member profile",
    firstSuperAdmin.member !== null && firstSuperAdmin.member !== undefined,
  );
  TestValidator.predicate(
    "member has valid email",
    firstSuperAdmin.member.email !== null &&
      firstSuperAdmin.member.email !== undefined,
  );
  TestValidator.predicate(
    "member has valid id",
    firstSuperAdmin.member.id !== null &&
      firstSuperAdmin.member.id !== undefined,
  );
  // 9. Test no filters (return all administrators)
  const allAdminsResult =
    await api.functional.shoppingMall.admin.administrators.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(allAdminsResult);
  TestValidator.predicate(
    "unfiltered returns all admins",
    allAdminsResult.data.length >= 3,
  );
  // 10. Validate grade distribution in unfiltered results
  const superCount = allAdminsResult.data.filter(
    (admin) => admin.grade === "super",
  ).length;
  const regularCount = allAdminsResult.data.filter(
    (admin) => admin.grade === "regular",
  ).length;
  TestValidator.predicate(
    "super count matches filtered result",
    superCount >= 2,
  );
  TestValidator.predicate(
    "regular count matches filtered result",
    regularCount >= 1,
  );
}
