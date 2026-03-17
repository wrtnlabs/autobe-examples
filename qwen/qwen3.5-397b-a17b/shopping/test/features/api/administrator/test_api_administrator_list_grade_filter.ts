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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test administrator listing with grade-based filtering.
 *
 * This test validates the PATCH /shoppingMall/superAdmin/admins endpoint's
 * grade filtering functionality. A super administrator creates test data
 * with multiple administrators of different grades, then verifies that
 * filtering by grade returns only administrators with the specified grade.
 *
 * Test flow:
 * 1. Super admin creates account and logs in
 * 2. Create multiple regular admin accounts (ADMIN grade)
 * 3. Promote one admin to SUPER_ADMIN grade
 * 4. Filter by grade=ADMIN - verify only ADMIN grade admins returned (excludes promoted)
 * 5. Filter by grade=SUPER_ADMIN - verify only SUPER_ADMIN grade admins returned
 */
export async function test_api_administrator_list_grade_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create multiple regular admin accounts (ADMIN grade) and track their IDs
  const adminIds: string[] = [];
  const adminEmails: string[] = [];
  for (let i = 0; i < 3; i++) {
    const adminEmail = typia.random<string & tags.Format<"email">>();
    adminEmails.push(adminEmail);
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        password: "Admin123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
    typia.assert(admin);
    adminIds.push(admin.id);
  }
  // 3. Promote the first admin to SUPER_ADMIN
  const promotedAdminId = adminIds[0];
  const promotedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.promote(
      superAdminConnection,
      {
        adminId: promotedAdminId,
      },
    );
  typia.assert(promotedAdmin);
  TestValidator.equals(
    "promoted admin grade",
    promotedAdmin.grade,
    "SUPER_ADMIN",
  );
  // 4. Test filtering by grade=ADMIN
  // Should return 2 admins (the ones not promoted)
  const adminGradeFilter =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "ADMIN",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(adminGradeFilter);
  TestValidator.predicate(
    "ADMIN filter returns only ADMIN grade",
    adminGradeFilter.data.every((admin) => admin.grade === "ADMIN"),
  );
  TestValidator.equals("ADMIN filter count", adminGradeFilter.data.length, 2);
  TestValidator.equals(
    "ADMIN filter pagination records",
    adminGradeFilter.pagination.records,
    2,
  );
  TestValidator.predicate(
    "ADMIN filter excludes promoted admin",
    !adminGradeFilter.data.some((admin) => admin.id === promotedAdminId),
  );
  // 5. Test filtering by grade=SUPER_ADMIN
  // Should return 2 admins: the original super admin + the promoted admin
  const superAdminGradeFilter =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "SUPER_ADMIN",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(superAdminGradeFilter);
  TestValidator.predicate(
    "SUPER_ADMIN filter returns only SUPER_ADMIN grade",
    superAdminGradeFilter.data.every((admin) => admin.grade === "SUPER_ADMIN"),
  );
  TestValidator.equals(
    "SUPER_ADMIN filter count",
    superAdminGradeFilter.data.length,
    2,
  );
  TestValidator.equals(
    "SUPER_ADMIN filter pagination records",
    superAdminGradeFilter.pagination.records,
    2,
  );
  TestValidator.predicate(
    "SUPER_ADMIN filter includes promoted admin",
    superAdminGradeFilter.data.some((admin) => admin.id === promotedAdminId),
  );
}
