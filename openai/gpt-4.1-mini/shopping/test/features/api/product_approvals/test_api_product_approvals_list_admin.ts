import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductApproval";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_product_approvals_list_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminSecret123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Assign 'admin' role to the authenticated admin user
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: admin.id,
        role_name: "admin",
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(userRole);

  // 3. Prepare request body for product approvals index
  const requestBody: IShoppingMallProductApproval.IRequest = {
    page: 1,
    limit: 5,
    sort_by: "created_at",
    order: "desc",
    status: "pending",
    admin_id: admin.id,
  };

  // 4. Fetch product approvals for the admin
  const pageResult: IPageIShoppingMallProductApproval.ISummary =
    await api.functional.shoppingMall.admin.productApprovals.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page equals requested",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested",
    pageResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination total records non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages at least 1",
    pageResult.pagination.pages >= 1,
  );

  // 6. Validate product approval items
  for (const approval of pageResult.data) {
    typia.assert(approval);
    TestValidator.predicate(
      "approval status is one of allowed",
      ["pending", "approved", "rejected"].includes(approval.status),
    );
    TestValidator.predicate(
      "approval has admin ID",
      typeof approval.shopping_mall_admin_id === "string" &&
        approval.shopping_mall_admin_id.length > 0,
    );
    TestValidator.predicate(
      "approval has product ID",
      typeof approval.shopping_mall_product_id === "string" &&
        approval.shopping_mall_product_id.length > 0,
    );
    TestValidator.predicate(
      "approval has a created_at timestamp",
      typeof approval.created_at === "string" && approval.created_at.length > 0,
    );
  }
}
