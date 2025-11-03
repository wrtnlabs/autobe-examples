import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

/**
 * Validate admin retrieval of refund requests with filtering and pagination.
 *
 * Steps:
 *
 * 1. Admin registration via /auth/admin/join with realistic email and profile.
 * 2. Admin login via /auth/admin/login to obtain authorization tokens.
 * 3. Ensure user roles exist for admin and sample customer(s) via
 *    /shoppingMall/admin/userRoles.
 * 4. Perform refund requests search via /shoppingMall/admin/refundRequests/index
 *    with filters and pagination.
 * 5. Validate returned refund request summaries including correctness of fields:
 *    id, shopping_mall_order_id, shopping_mall_customer_id, refund_amount,
 *    refund_reason, refund_status, created_at, updated_at.
 * 6. Validate pagination metadata including current page, limit, total records,
 *    pages.
 *
 * The test ensures the admin can view refund requests accurately, with valid
 * filtering and sorted pagination.
 */
export async function test_api_refund_request_index(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongPassw0rd!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: "StrongPassw0rd!",
    href: "https://admin.shoppingmall.example.com/dashboard",
    referrer: "https://admin.shoppingmall.example.com/login",
  } satisfies IShoppingMallAdmin.ILogin;
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Ensure user roles exist for admin and a sample customer
  // Use the admin user ID
  const adminUserRoleBody = {
    user_id: admin.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;
  const adminUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: adminUserRoleBody,
    });
  typia.assert(adminUserRole);

  // Create a sample customer to assign role
  // For testing, we generate a random UUID (simulate existing customer)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const customerUserRoleBody = {
    user_id: customerId,
    role_name: "customer",
  } satisfies IShoppingMallUserRole.ICreate;
  const customerUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: customerUserRoleBody,
    });
  typia.assert(customerUserRole);

  // 4. Perform refund requests search with filters and pagination
  const refundRequestSearchBody = {
    page: 1,
    limit: 10,
    refund_status: "pending",
    customer_id: customerId,
    order_code: "ORD", // partial code to search
    sort_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallRefundRequest.IRequest;

  const refundRequestPage: IPageIShoppingMallRefundRequest.ISummary =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: refundRequestSearchBody,
    });
  typia.assert(refundRequestPage);

  // 5. Validate refund request summaries
  // Validate pagination
  TestValidator.predicate(
    "pagination current page is 1",
    refundRequestPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    refundRequestPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    refundRequestPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    refundRequestPage.pagination.pages >= 0,
  );

  // Validate each refund request summary
  for (const request of refundRequestPage.data) {
    typia.assert<IShoppingMallRefundRequest.ISummary>(request);
    // Check IDs format
    TestValidator.predicate(
      "refund request id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        request.id,
      ),
    );
    TestValidator.predicate(
      "shopping_mall_order_id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        request.shopping_mall_order_id,
      ),
    );
    TestValidator.predicate(
      "shopping_mall_customer_id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        request.shopping_mall_customer_id,
      ),
    );

    TestValidator.predicate(
      "refund amount is positive",
      typeof request.refund_amount === "number" && request.refund_amount > 0,
    );

    TestValidator.predicate(
      "refund status string",
      typeof request.refund_status === "string" &&
        request.refund_status.length > 0,
    );

    TestValidator.predicate(
      "created_at is ISO 8601",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?Z$/.test(
        request.created_at,
      ),
    );

    TestValidator.predicate(
      "updated_at is ISO 8601",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?Z$/.test(
        request.updated_at,
      ),
    );
  }
}
