import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

/**
 * Search admin audit logs by acting admin and time window after basic business
 * activity.
 *
 * Business context
 *
 * - Validate that an authenticated admin can query the immutable admin audit
 *   trail using complex filters, particularly shopping_mall_admin_id and
 *   created_at window, after some normal business activity has occurred in the
 *   system (customer join + cart creation).
 * - The test does NOT depend on a specific action_type or guarantee that cart
 *   activity is logged in a particular way; instead, it focuses on verifying
 *   that the search filters and pagination behave consistently and that any
 *   returned entries are coherent with the requested admin filter.
 *
 * High-level steps
 *
 * 1. Register an admin with POST /auth/admin/join and capture the resulting
 *    IShoppingMallAdmin.IAuthorized, including its id and issued tokens.
 * 2. Re-login as the same admin with POST /auth/admin/login to demonstrate actor
 *    switching usage pattern.
 * 3. Register a customer with POST /auth/customer/join and capture the
 *    IShoppingMallCustomer.IAuthorized result.
 * 4. Login as the same customer with POST /auth/customer/login.
 * 5. Create a cart via POST /shoppingMall/customer/carts using a minimal but valid
 *    IShoppingMallCart.ICreate payload so the system has some recent business
 *    activity.
 * 6. Switch back to the admin context via POST /auth/admin/login.
 * 7. Build an IShoppingMallAdminAuditLog.IRequest body that:
 *
 *    - Sets shopping_mall_admin_id to the admin.id
 *    - Leaves action_type and entity_type as null (no extra filter)
 *    - Sets from_created_at and to_created_at to a tight window around `now` so that
 *         recent actions are favored
 *    - Sets page and limit for pagination (e.g., page=0, limit=20)
 * 8. Call PATCH /shoppingMall/admin/adminAuditLogs using that request.
 * 9. Assert that the response passes typia.assert as
 *    IPageIShoppingMallAdminAuditLog.ISummary.
 * 10. Validate that pagination.current and pagination.limit equal the values in the
 *     request.
 * 11. If any audit log entries are returned, assert that:
 *
 *     - Shopping_mall_admin_id is either null (system action) or matches the current
 *           admin.id when present
 *     - When admin is present, its id and email match the filter admin
 *     - Created_at timestamps fall between from_created_at and to_created_at
 *           (inclusive).
 */
export async function test_api_admin_audit_logs_search_by_admin_and_action_type(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId = adminAuthorized.id;
  const adminEmail = adminAuthorized.email;

  // 2. Re-login as admin to demonstrate actor switching (and ensure header is set)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginResult);

  // 3. Register a customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 4. Login as the same customer
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoginResult);

  // 5. Create a cart as customer to generate business activity
  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 6. Switch back to admin context via login
  const adminReloginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminReloginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReloginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminReloginResult);

  // 7. Build audit log search request filtered by admin and time window
  const now = new Date();
  const fiveMinutesMs = 5 * 60 * 1000;
  const from = new Date(now.getTime() - fiveMinutesMs).toISOString();
  const to = new Date(now.getTime() + fiveMinutesMs).toISOString();

  const page: number & tags.Type<"int32"> = 0 as number & tags.Type<"int32">;
  const limit: number & tags.Type<"int32"> = 20 as number & tags.Type<"int32">;

  const auditRequestBody = {
    shopping_mall_admin_id: adminId,
    action_type: null,
    entity_type: null,
    entity_id: null,
    request_id: null,
    ip: null,
    user_agent: null,
    message: null,
    from_created_at: from,
    to_created_at: to,
    page,
    limit,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  // 8. Call PATCH /shoppingMall/admin/adminAuditLogs
  const pageResult: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: auditRequestBody,
    });
  typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;

  // 9. Validate pagination metadata matches requested page/limit
  TestValidator.equals(
    "pagination current page should match request page",
    page,
    pagination.current,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    limit,
    pagination.limit,
  );

  // 10. If there are any audit log entries, validate they align with filters
  if (pageResult.data.length > 0) {
    for (const entry of pageResult.data) {
      typia.assert<IShoppingMallAdminAuditLog.ISummary>(entry);

      // shopping_mall_admin_id, when present, must match filter adminId
      if (
        entry.shopping_mall_admin_id !== null &&
        entry.shopping_mall_admin_id !== undefined
      ) {
        TestValidator.equals(
          "audit entry admin id matches filter admin id when present",
          entry.shopping_mall_admin_id,
          adminId,
        );
      }

      // If admin summary is populated, its id/email must match
      if (entry.admin !== undefined) {
        TestValidator.equals(
          "audit entry admin summary id matches filter admin id",
          entry.admin.id,
          adminId,
        );
        TestValidator.equals(
          "audit entry admin summary email matches admin email",
          entry.admin.email,
          adminEmail,
        );
      }

      // created_at must be within [from, to]
      const createdAtTime = new Date(entry.created_at).getTime();
      const fromTime = new Date(from).getTime();
      const toTime = new Date(to).getTime();

      TestValidator.predicate(
        "audit entry created_at is on or after from_created_at",
        createdAtTime >= fromTime,
      );
      TestValidator.predicate(
        "audit entry created_at is on or before to_created_at",
        createdAtTime <= toTime,
      );
    }
  }
}
