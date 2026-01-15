import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPayment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPaymentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_payment_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join", // Required URI format
        referrer: "https://example.com/admin/signup", // Required URI format
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Generate valid order code (business identifier)
  const orderCode = "ORD-" + RandomGenerator.alphaNumeric(8);
  // Step 3: Create payment request with realistic filtering parameters
  const paymentRequest: IShoppingMallOrderPayment.IRequest = {
    status: ["captured", "settled", "pending"], // Multiple valid statuses
    paymentMethod: ["credit_card", "digital_wallet", "bank_transfer"], // Multiple valid methods
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
    endDate: new Date().toISOString(), // Current date
    currency: ["KRW", "USD", "EUR"], // Multiple ISO 4217 currencies
    sortBy: "createdAt", // Valid sort field
    sortOrder: "desc", // Valid sort direction
    page: 1, // Valid page number
    limit: 20, // Within valid limit range (1-500)
  } satisfies IShoppingMallOrderPayment.IRequest;
  // Step 4: Call payments index endpoint with generated parameters
  const paymentHistory: IPageIShoppingMallOrderPayment =
    await api.functional.shoppingMall.admin.orders.payments.index(
      adminConnection, // Use adminConnection (never use base connection)
      {
        orderCode,
        body: paymentRequest,
      },
    );
  typia.assert(paymentHistory);
  // Step 5: Validate response structure with business logic checks only
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paymentHistory.pagination.current,
    paymentRequest.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    paymentHistory.pagination.limit,
    paymentRequest.limit ?? 20,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    paymentHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    paymentHistory.pagination.pages >= 0,
  );
  // Only validate business-relevant properties that are part of assumption, NOT format or type
  // For example: positive amount, valid statuses, etc.
  for (const payment of paymentHistory.data) {
    // Business logic: amount should be non-negative (already covered by type constraint in schema)
    TestValidator.predicate(
      "payment amount is non-negative",
      payment.amount >= 0,
    );
    // Business logic: status must be one of the defined values (schema already enforces this)
    TestValidator.predicate(
      "payment status is valid enumeration",
      [
        "pending",
        "processing",
        "authorized",
        "captured",
        "declined",
        "refunded",
        "partially_refunded",
        "failed",
        "cancelled",
        "settled",
      ].includes(payment.status),
    );
    // Business logic: payment_method must be one of the defined values (schema already enforces this)
    TestValidator.predicate(
      "payment method is valid enumeration",
      [
        "credit_card",
        "debit_card",
        "digital_wallet",
        "bank_transfer",
        "cryptocurrency",
        "gift_card",
        "paypal",
        "apple_pay",
        "google_pay",
        "alipay",
        "wechat_pay",
        "sepa",
        "ach",
        "bacs",
        "klarna",
        "afterpay",
        "paylater",
        "shop_pay",
      ].includes(payment.payment_method),
    );
    // Business logic: fraud_check must be one of the defined values (schema already enforces this)
    TestValidator.predicate(
      "fraud check result is valid",
      ["pass", "fail", "manual_review"].includes(payment.fraud_check),
    );
  }
}
