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
 * Verify that an authenticated admin can search admin audit logs and retrieve a
 * detailed audit log entry, after some customer-side cart activity has
 * occurred.
 *
 * Business flow implemented (within available APIs):
 *
 * 1. Register a customer (POST /auth/customer/join) to create a real customer
 *    account and obtain a customer-authenticated context.
 * 2. As that customer, create a shopping cart header (POST
 *    /shoppingMall/customer/carts) using IShoppingMallCart.ICreate to simulate
 *    meaningful marketplace activity.
 * 3. Register an admin (POST /auth/admin/join) to obtain an admin-authenticated
 *    context capable of accessing admin audit logs.
 * 4. As the admin, search audit logs via PATCH /shoppingMall/admin/adminAuditLogs
 *    using an IShoppingMallAdminAuditLog.IRequest body that filters at least on
 *    the current admin id and uses a deterministic pagination (page, limit) so
 *    that we obtain a concrete page of IShoppingMallAdminAuditLog.ISummary.
 * 5. If the search returns at least one audit log summary, pick the first entry
 *    and call GET /shoppingMall/admin/adminAuditLogs/{id} to retrieve its full
 *    detail as IShoppingMallAdminAuditLog.
 * 6. Verify structural and logical consistency between summary and detail:
 *
 *    - The detail id matches the summary id.
 *    - Core fields like action_type, entity_type, and created_at are present and
 *         non-empty.
 *    - Optional metadata fields (entity_id, entity_display, ip, user_agent, message,
 *         before_snapshot, after_snapshot) are either present or
 *         null/undefined; we do not enforce stricter semantics because logging
 *         internals are not visible from the public contract.
 * 7. Independently, call the detail endpoint with a random UUID that is extremely
 *    unlikely to exist, wrapped in TestValidator.error, to confirm that the
 *    endpoint signals an error for non-existing adminAuditLogId without
 *    asserting on specific HTTP status codes.
 */
export async function test_api_admin_audit_log_detail_after_customer_cart_activity(
  connection: api.IConnection,
) {
  // 1. Register a new customer to simulate a real shopper and
  //    establish a customer-authenticated context.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. As the authenticated customer, create a cart header to simulate
  //    cart-related business activity.
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // Basic sanity checks on cart fields to ensure we have a
  // well-formed cart object.
  TestValidator.predicate(
    "cart id should be a non-empty string",
    typeof cart.id === "string" && cart.id.length > 0,
  );
  TestValidator.predicate(
    "cart actor_type should equal 'customer'",
    cart.actor_type === "customer",
  );
  TestValidator.predicate(
    "cart status should equal 'active'",
    cart.status === "active",
  );

  // 3. Register a new admin to obtain an admin-authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Ensure admin carries a valid token and id that we can use in
  // filtering.
  TestValidator.predicate(
    "admin id should be a non-empty string",
    typeof adminAuthorized.id === "string" && adminAuthorized.id.length > 0,
  );
  TestValidator.predicate(
    "admin access token should be a non-empty string",
    typeof adminAuthorized.token.access === "string" &&
      adminAuthorized.token.access.length > 0,
  );

  // 4. As the admin, search audit logs with a filter on the current
  //    admin id and deterministic pagination to obtain summaries.
  const nowIso = new Date().toISOString();
  const fromIso = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

  const auditSearchBody = {
    shopping_mall_admin_id: adminAuthorized.id,
    action_type: null,
    entity_type: null,
    entity_id: null,
    request_id: null,
    ip: null,
    user_agent: null,
    message: null,
    from_created_at: fromIso,
    to_created_at: nowIso,
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const pageResult: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: auditSearchBody,
    });
  typia.assert(pageResult);

  // Basic pagination sanity checks.
  TestValidator.predicate(
    "audit log pagination current page should be 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "audit log pagination limit should be positive",
    pageResult.pagination.limit >= 0,
  );

  const summaries: IShoppingMallAdminAuditLog.ISummary[] = pageResult.data;

  // 5. If there is at least one audit log summary, load its detail and
  //    assert consistency.
  if (summaries.length > 0) {
    const firstSummary: IShoppingMallAdminAuditLog.ISummary = summaries[0];
    typia.assert(firstSummary);

    TestValidator.predicate(
      "first audit log summary id should be non-empty",
      typeof firstSummary.id === "string" && firstSummary.id.length > 0,
    );

    const detail: IShoppingMallAdminAuditLog =
      await api.functional.shoppingMall.admin.adminAuditLogs.at(connection, {
        adminAuditLogId: firstSummary.id,
      });
    typia.assert(detail);

    // ID consistency between summary and detail.
    TestValidator.equals(
      "audit log detail id matches summary id",
      detail.id,
      firstSummary.id,
    );

    // Core required fields should be non-empty strings.
    TestValidator.predicate(
      "audit log action_type should be non-empty",
      typeof detail.action_type === "string" && detail.action_type.length > 0,
    );
    TestValidator.predicate(
      "audit log entity_type should be non-empty",
      typeof detail.entity_type === "string" && detail.entity_type.length > 0,
    );
    TestValidator.predicate(
      "audit log created_at should be non-empty",
      typeof detail.created_at === "string" && detail.created_at.length > 0,
    );

    // Validate that when admin info is present on the summary, it
    // relates to the current admin id.
    if (
      firstSummary.shopping_mall_admin_id !== null &&
      firstSummary.shopping_mall_admin_id !== undefined
    ) {
      TestValidator.equals(
        "summary shopping_mall_admin_id should match current admin id when present",
        firstSummary.shopping_mall_admin_id,
        adminAuthorized.id,
      );
    }
  }

  // 7. Negative path: calling detail with a random UUID-like value
  //    should yield an error. We do not assert on HTTP status.
  const randomNonExistingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "admin audit log detail with non-existing id should error",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.at(connection, {
        adminAuditLogId: randomNonExistingId,
      });
    },
  );
}
