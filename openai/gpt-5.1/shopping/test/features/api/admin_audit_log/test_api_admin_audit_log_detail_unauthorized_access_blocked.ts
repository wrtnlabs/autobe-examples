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
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

export async function test_api_admin_audit_log_detail_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Prepare an arbitrary UUID-like admin audit log id for negative tests
  const arbitraryAdminAuditLogId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Helper to clone connection with empty headers for unauthenticated calls
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Unauthenticated caller must not access admin audit log detail
  await TestValidator.error(
    "unauthenticated access to admin audit log detail must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.at(
        unauthenticatedConnection,
        {
          adminAuditLogId: arbitraryAdminAuditLogId,
        },
      );
    },
  );

  // 3. Register a normal customer and obtain a customer-authenticated context
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Customer-authenticated caller must also not access admin audit log detail
  await TestValidator.error(
    "customer-authenticated access to admin audit log detail must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.at(connection, {
        adminAuditLogId: arbitraryAdminAuditLogId,
      });
    },
  );

  // 5. Register an admin and obtain admin-authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. As admin, search audit logs to obtain at least one real entry
  const searchRequestBody = {
    shopping_mall_admin_id: null,
    action_type: null,
    entity_type: null,
    entity_id: null,
    request_id: null,
    ip: null,
    user_agent: null,
    message: null,
    from_created_at: null,
    to_created_at: null,
    page: null,
    limit: null,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const page: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(page);

  const hasAnyLog = page.data.length > 0;

  if (!hasAnyLog) {
    // If there are no logs, we cannot perform the positive detail retrieval,
    // but the unauthorized access checks have already been validated.
    return;
  }

  const firstLogSummary: IShoppingMallAdminAuditLog.ISummary = page.data[0];
  typia.assert<IShoppingMallAdminAuditLog.ISummary>(firstLogSummary);

  // 7. As admin, retrieve the full detail for the known audit log id
  const detail: IShoppingMallAdminAuditLog =
    await api.functional.shoppingMall.admin.adminAuditLogs.at(connection, {
      adminAuditLogId: firstLogSummary.id,
    });
  typia.assert(detail);

  // Basic consistency check between summary and detail
  TestValidator.equals(
    "admin audit log detail should match summary id",
    detail.id,
    firstLogSummary.id,
  );
}
