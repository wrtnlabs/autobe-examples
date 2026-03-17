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

export async function test_api_admin_list_filtered_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // Step A: Filter by 'super' grade
  const superGradeResult =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "super",
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(superGradeResult);
  // Validate: all returned items must have grade === 'super'
  TestValidator.predicate(
    "all items in super grade filter must have grade=super",
    () => superGradeResult.data.every((admin) => admin.grade === "super"),
  );
  // Validate: no items with grade === 'regular' should be present
  TestValidator.predicate("no regular grade admins in super grade filter", () =>
    superGradeResult.data.every((admin) => admin.grade !== "regular"),
  );
  // Validate: pagination.records must be >= 1 (we just registered a super admin)
  TestValidator.predicate(
    "super grade records count must be >= 1",
    () => superGradeResult.pagination.records >= 1,
  );
  // Validate: the registered super admin must appear in results
  // Use email filter to narrow down and confirm the super admin shows up with grade='super'
  const superAdminEmailResult =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "super",
          email: superAdmin.email,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(superAdminEmailResult);
  TestValidator.predicate(
    "registered super admin must appear in super grade filter",
    () =>
      superAdminEmailResult.data.some(
        (admin) => admin.email === superAdmin.email && admin.grade === "super",
      ),
  );
  // Step B: Filter by 'regular' grade
  const regularGradeResult =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(regularGradeResult);
  // Validate: all returned items must have grade === 'regular'
  TestValidator.predicate(
    "all items in regular grade filter must have grade=regular",
    () => regularGradeResult.data.every((admin) => admin.grade === "regular"),
  );
  // Validate: the registered super admin must NOT appear in regular grade results
  TestValidator.predicate(
    "registered super admin must not appear in regular grade filter",
    () =>
      regularGradeResult.data.every(
        (admin) => admin.email !== superAdmin.email,
      ),
  );
  // Validate: if no regular admins exist, data must be empty and records === 0
  if (regularGradeResult.data.length === 0) {
    TestValidator.equals(
      "records must be 0 when no regular admins exist",
      regularGradeResult.pagination.records,
      0,
    );
  }
  // Validate: pagination metadata must be valid
  TestValidator.predicate(
    "regular grade pagination current page must be 1",
    () => regularGradeResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "regular grade pagination pages must be >= 0",
    () => regularGradeResult.pagination.pages >= 0,
  );
}
