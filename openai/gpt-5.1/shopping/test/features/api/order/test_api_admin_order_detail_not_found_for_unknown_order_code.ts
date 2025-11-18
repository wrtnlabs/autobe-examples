import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Verify admin order detail lookup fails for an unknown orderCode.
 *
 * Business intent:
 *
 * - Admins can fetch detailed order information by business-facing orderCode
 *   through GET /shoppingMall/admin/orders/{orderCode}.
 * - When the given orderCode does not correspond to any existing order, the
 *   platform must signal a not-found style error and must not return any
 *   IShoppingMallOrder payload.
 * - Error responses must not leak internal implementation details such as SQL
 *   queries or stack traces, but from the E2E perspective we only need to
 *   ensure that the call fails rather than succeeds.
 *
 * Test strategy:
 *
 * 1. Register an admin via POST /auth/admin/join using a realistic join DTO. This
 *    both creates the admin record and configures the connection to carry the
 *    admin access token via the SDK.
 * 2. Generate a random business orderCode string that is extremely unlikely to
 *    exist in the test database, using RandomGenerator.alphaNumeric combined
 *    with a clear prefix so that the value is recognizable in logs (e.g.
 *    "TEST-UNKNOWN-ORDER-<random>").
 * 3. Call api.functional.shoppingMall.admin.orders.at with that orderCode and
 *    assert using TestValidator.error that the call throws (indicating a
 *    not-found or similar error), and that no IShoppingMallOrder object is
 *    produced.
 * 4. Repeat the same call with the identical orderCode to ensure that the behavior
 *    is stable and still results in an error.
 *
 * Notes and constraints:
 *
 * - We must not test specific HTTP status codes (e.g. 404) or parse error
 *   payloads, only that an error occurs for the missing order.
 * - We must not deliberately craft type-invalid requests; the orderCode must be a
 *   valid string value from TypeScript's perspective.
 * - We rely on the SDK and backend to enforce the platform-wide error handling
 *   contract and to avoid leaking sensitive details; the E2E test only
 *   validates the high-level failure behavior for unknown order codes.
 */
export async function test_api_admin_order_detail_not_found_for_unknown_order_code(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Generate a clearly unknown order code
  const randomSuffix: string = RandomGenerator.alphaNumeric(24);
  const unknownOrderCode: string = `TEST-UNKNOWN-ORDER-${randomSuffix}`;

  // 3. First attempt: calling detail endpoint with unknown orderCode must error
  await TestValidator.error(
    "admin order detail should fail for non-existent orderCode (first call)",
    async () => {
      await api.functional.shoppingMall.admin.orders.at(connection, {
        orderCode: unknownOrderCode,
      });
    },
  );

  // 4. Second attempt with the same code must also error consistently
  await TestValidator.error(
    "admin order detail should consistently fail for the same unknown orderCode (second call)",
    async () => {
      await api.functional.shoppingMall.admin.orders.at(connection, {
        orderCode: unknownOrderCode,
      });
    },
  );
}
