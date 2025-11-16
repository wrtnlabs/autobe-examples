import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentRefund";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";

/**
 * Validate admin search for refunds for a given payment (empty and error states
 * only).
 *
 * 1. Register an admin.
 * 2. Create a payment as that admin.
 * 3. Search for payment refunds as admin (should be empty, since refunds cannot be
 *    created by this API).
 * 4. Attempt search with an invalid paymentId (should fail with error).
 * 5. Validate response shapes, pagination/meta data, and that edge cases are
 *    covered.
 */
export async function test_api_payment_refund_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin and get authentication
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Auto123!@#Admin",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a payment via admin
  // We need valid references for customer_id and provider_id
  // Since there is no customer/provider creation endpoint available in the test scope,
  // use randoms with correct tags
  const payment = await api.functional.shoppingMall.admin.payments.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        provider_id: typia.random<string & tags.Format<"uuid">>(),
        amount: Math.floor(Math.random() * 100_000) + 1000,
        currency: "KRW",
        method_type: RandomGenerator.pick([
          "card",
          "e-wallet",
          "bank_transfer",
        ] as const),
        status: "initiated",
        external_payment_id: RandomGenerator.alphaNumeric(18),
        transaction_token: RandomGenerator.alphaNumeric(24),
        requested_at: new Date().toISOString(),
      } satisfies IShoppingMallPayment.ICreate,
    },
  );
  typia.assert(payment);

  // 3. Search for payment refunds (should be empty, edge/pagination assertions)
  const page = await api.functional.shoppingMall.admin.payments.refunds.index(
    connection,
    {
      paymentId: payment.id,
      body: {
        page: 1,
        page_size: 20,
      } satisfies IShoppingMallPaymentRefund.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "refund list for new payment should be empty",
    page.data,
    [],
  );
  TestValidator.predicate(
    "pagination info reflects no refunds",
    page.pagination.current === 1 &&
      page.pagination.limit === 20 &&
      page.pagination.records === 0 &&
      page.pagination.pages === 0,
  );

  // 4. Search with an invalid paymentId (should throw error)
  await TestValidator.error(
    "search with non-existent paymentId throws error",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.index(
        connection,
        {
          paymentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
          } satisfies IShoppingMallPaymentRefund.IRequest,
        },
      );
    },
  );
}
