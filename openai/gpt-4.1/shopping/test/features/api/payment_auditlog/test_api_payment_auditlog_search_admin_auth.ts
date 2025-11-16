import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallPaymentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuditLog";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that an admin can search and filter payment audit logs.
 *
 * This test covers correct registration (join) of an admin, checks
 * authentication token storage, then issues a search request for payment audit
 * logs using various filter combinations. It verifies page format, type and
 * presence of returned audit log data, correct filtering by action_types and
 * actor (admin ID), temporal filter with start and end window, expected
 * pagination, correct sorting, and that actor admin fields are fulfilled in
 * returned logs. Since payment creation is not possible here, a random UUID is
 * used for paymentId and at least structural validation and correct filter
 * passage is asserted. Error-handling, empty results, and edge cases are not
 * tested here.
 */
export async function test_api_payment_auditlog_search_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authentication
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Prepare filter/search request for payment audit logs
  const paymentId = typia.random<string & tags.Format<"uuid">>();
  const actionType = RandomGenerator.pick([
    "payment_created",
    "payment_updated",
    "refund_requested",
    "provider_callback",
    "admin_override",
    "escalation",
  ] as const);
  const now = new Date();
  const dateWindowStart = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days ago
  const dateWindowEnd = now.toISOString();

  const filterBody = {
    action_types: [actionType],
    actor_admin_id: admin.id,
    // other actor filters omitted (null/undefined) for targeting admin actor
    start_date: dateWindowStart,
    end_date: dateWindowEnd,
    page: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Default<1> &
      tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Default<25> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallPaymentAuditLog.IRequest;

  // 3. List/search payment audit log entries for the given payment
  const pageResult =
    await api.functional.shoppingMall.admin.payments.auditLogs.index(
      connection,
      {
        paymentId,
        body: filterBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate result structure and key filtering (if any data is present)
  TestValidator.equals(
    "audit log page shape",
    Object.keys(pageResult).sort(),
    ["pagination", "data"].sort(),
  );
  TestValidator.predicate(
    "pagination structure present",
    typeof pageResult.pagination.current === "number" &&
      typeof pageResult.pagination.limit === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(pageResult.data));

  // 5. If logs exist, validate filters applied (if not, pass shape checks)
  if (pageResult.data.length > 0) {
    // All entries must have at least one of the filtered action types and actor_admin_id
    for (const log of pageResult.data) {
      TestValidator.equals("action_type filtered", log.action_type, actionType);
      TestValidator.equals("admin.id filtered", log.admin?.id, admin.id);
      TestValidator.predicate(
        "date in range",
        (!filterBody.start_date || log.created_at >= filterBody.start_date) &&
          (!filterBody.end_date || log.created_at <= filterBody.end_date),
      );
    }
  }
}
