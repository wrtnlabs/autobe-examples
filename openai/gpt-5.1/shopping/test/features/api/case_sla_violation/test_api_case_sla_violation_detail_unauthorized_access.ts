import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCaseSlaViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaViolation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify that SLA violation detail endpoint is protected from unauthorized
 * access.
 *
 * Business intent:
 *
 * - The GET /shoppingMall/admin/caseSlaViolations/{caseSlaViolationId} endpoint
 *   is an admin-only diagnostic/governance endpoint and must not be accessible
 *   by unauthenticated callers or non-admin actors such as customers.
 *
 * Scenario:
 *
 * 1. Prepare a syntactically valid SLA violation ID using typia.random<uuid>(). We
 *    do not depend on an actual record existing, because authorization should
 *    fail before (or regardless of) resource existence for unauthorized
 *    callers.
 * 2. Attempt to call the endpoint without any Authorization header using a derived
 *    unauthenticated connection and assert that an error is thrown.
 * 3. Join as a customer (non-admin) using POST /auth/customer/join, which
 *    authenticates the shared connection with a customer token.
 * 4. Attempt to call the admin endpoint again with the customer-authenticated
 *    connection and assert that an error is thrown.
 *
 * Validation focus:
 *
 * - We only assert that unauthorized calls fail via TestValidator.error, without
 *   inspecting HttpError status codes or messages.
 * - We do not manipulate connection.headers directly except when creating a
 *   cloned unauthenticated connection object with empty headers, leaving all
 *   subsequent header management to the SDK.
 */
export async function test_api_case_sla_violation_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Prepare a syntactically valid SLA violation ID (UUID format).
  const caseSlaViolationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Unauthenticated access: clone connection with empty headers.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated caller cannot access admin SLA violation detail",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaViolations.at(unauthConn, {
        caseSlaViolationId,
      });
    },
  );

  // 3. Join as a customer to obtain a non-admin token on the main connection.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 4. Non-admin (customer) access attempt should also fail.
  await TestValidator.error(
    "customer actor cannot access admin SLA violation detail",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaViolations.at(connection, {
        caseSlaViolationId,
      });
    },
  );
}
