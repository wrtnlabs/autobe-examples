import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator account listing filtered by admin grade.
 *
 * Validates that administrators can filter admin accounts by their privilege level (regular, super).
 * Tests single grade filtering, combined filtering, and edge cases.
 *
 * Note: Admin registration creates 'regular' admins by default. Super admins are created through
 * other administrative operations not covered in this test. This test focuses on filtering
 * functionality with the available admin accounts.
 */
export async function test_api_admin_list_by_admin_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and register (will be 'regular' grade by default)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  TestValidator.equals(
    "admin grade on registration",
    superAdmin.admin_grade,
    "regular",
  );
  // 2. Create additional regular administrator accounts
  const regularAdminConnection1: api.IConnection = { host: connection.host };
  const regularAdmin1 = await authorize_admin_join(regularAdminConnection1, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin1);
  TestValidator.equals(
    "regular admin 1 grade",
    regularAdmin1.admin_grade,
    "regular",
  );
  const regularAdminConnection2: api.IConnection = { host: connection.host };
  const regularAdmin2 = await authorize_admin_join(regularAdminConnection2, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin2);
  TestValidator.equals(
    "regular admin 2 grade",
    regularAdmin2.admin_grade,
    "regular",
  );
  // 3. Test filtering by admin_grade='regular'
  const regularFilterConnection: api.IConnection = { host: connection.host };
  regularFilterConnection.headers = { Authorization: superAdmin.token.access };
  const regularAdmins = await api.functional.ecommerceMall.admin.admins.index(
    regularFilterConnection,
    {
      body: {
        admin_grade:
          "regular" satisfies IEcommerceMallAdmin.IRequest["admin_grade"],
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(regularAdmins);
  TestValidator.equals(
    "regular admins count",
    regularAdmins.pagination.records,
    3,
  );
  TestValidator.predicate(
    "all regular admins",
    regularAdmins.data.every((admin) => admin.admin_grade === "regular"),
  );
  TestValidator.predicate(
    "contains super admin",
    regularAdmins.data.some((admin) => admin.id === superAdmin.id),
  );
  TestValidator.predicate(
    "contains regular admin 1",
    regularAdmins.data.some((admin) => admin.id === regularAdmin1.id),
  );
  TestValidator.predicate(
    "contains regular admin 2",
    regularAdmins.data.some((admin) => admin.id === regularAdmin2.id),
  );
  // 4. Test filtering by admin_grade='super' (may return empty if no super admins exist)
  const superFilterConnection: api.IConnection = { host: connection.host };
  superFilterConnection.headers = { Authorization: superAdmin.token.access };
  const superAdmins = await api.functional.ecommerceMall.admin.admins.index(
    superFilterConnection,
    {
      body: {
        admin_grade:
          "super" satisfies IEcommerceMallAdmin.IRequest["admin_grade"],
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(superAdmins);
  // Verify that super filter returns only super grade admins (may be 0 or more)
  TestValidator.predicate(
    "all super admins",
    superAdmins.data.every((admin) => admin.admin_grade === "super"),
  );
  // 5. Test no grade filter (all grades)
  const allFilterConnection: api.IConnection = { host: connection.host };
  allFilterConnection.headers = { Authorization: superAdmin.token.access };
  const allAdmins = await api.functional.ecommerceMall.admin.admins.index(
    allFilterConnection,
    {
      body: {
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(allAdmins);
  TestValidator.equals("all admins count", allAdmins.pagination.records, 3);
  TestValidator.predicate(
    "contains all admins",
    allAdmins.data.some((admin) => admin.id === superAdmin.id) &&
      allAdmins.data.some((admin) => admin.id === regularAdmin1.id) &&
      allAdmins.data.some((admin) => admin.id === regularAdmin2.id),
  );
  // 6. Test combined filtering: admin_grade='regular' + account_status='active'
  const combinedFilterConnection: api.IConnection = { host: connection.host };
  combinedFilterConnection.headers = { Authorization: superAdmin.token.access };
  const combinedAdmins = await api.functional.ecommerceMall.admin.admins.index(
    combinedFilterConnection,
    {
      body: {
        admin_grade:
          "regular" satisfies IEcommerceMallAdmin.IRequest["admin_grade"],
        account_status:
          "active" satisfies IEcommerceMallAdmin.IRequest["account_status"],
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(combinedAdmins);
  TestValidator.equals(
    "combined filter count",
    combinedAdmins.pagination.records,
    3,
  );
  TestValidator.predicate(
    "all active regular admins",
    combinedAdmins.data.every(
      (admin) =>
        admin.admin_grade === "regular" && admin.account_status === "active",
    ),
  );
  // 7. Test email partial match with admin_grade filter
  const emailFilterConnection: api.IConnection = { host: connection.host };
  emailFilterConnection.headers = { Authorization: superAdmin.token.access };
  const emailFilterAdmins =
    await api.functional.ecommerceMall.admin.admins.index(
      emailFilterConnection,
      {
        body: {
          admin_grade:
            "regular" satisfies IEcommerceMallAdmin.IRequest["admin_grade"],
          email: regularAdmin1.email.split("@")[0], // Use email prefix for partial match
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(emailFilterAdmins);
  TestValidator.equals(
    "email filter count",
    emailFilterAdmins.pagination.records,
    1,
  );
  TestValidator.predicate(
    "contains regular admin 1",
    emailFilterAdmins.data.some((admin) => admin.id === regularAdmin1.id),
  );
  // 8. Test empty result: filter for non-existent combination
  const emptyFilterConnection: api.IConnection = { host: connection.host };
  emptyFilterConnection.headers = { Authorization: superAdmin.token.access };
  const emptyAdmins = await api.functional.ecommerceMall.admin.admins.index(
    emptyFilterConnection,
    {
      body: {
        admin_grade:
          "regular" satisfies IEcommerceMallAdmin.IRequest["admin_grade"],
        account_status:
          "banned" satisfies IEcommerceMallAdmin.IRequest["account_status"],
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(emptyAdmins);
  TestValidator.equals("empty result count", emptyAdmins.pagination.records, 0);
  TestValidator.equals("empty result data length", emptyAdmins.data.length, 0);
  // 9. Verify pagination metadata structure
  TestValidator.equals("pagination current", allAdmins.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit valid",
    allAdmins.pagination.limit > 0 && allAdmins.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    allAdmins.pagination.pages >= 1,
  );
}