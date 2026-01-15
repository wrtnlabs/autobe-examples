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
import type { IShoppingMallOrderPaymentPaymentDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentPaymentDetails";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_payment_analytics_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCreds },
  );
  typia.assert(admin);
  // Step 2: Define request body with realistic filters
  const request: IShoppingMallOrderPayment.IRequest = {
    status: RandomGenerator.sample(
      [
        "captured",
        "refunded",
        "pending",
        "processing",
        "authorized",
        "declined",
        "failed",
        "cancelled",
        "settled",
      ],
      3,
    ) as (
      | "captured"
      | "refunded"
      | "pending"
      | "processing"
      | "authorized"
      | "declined"
      | "failed"
      | "cancelled"
      | "settled"
    )[],
    paymentMethod: RandomGenerator.sample(
      [
        "credit_card",
        "paypal",
        "digital_wallet",
        "debit_card",
        "bank_transfer",
        "cryptocurrency",
        "gift_card",
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
      ],
      3,
    ) as (
      | "credit_card"
      | "debit_card"
      | "digital_wallet"
      | "bank_transfer"
      | "cryptocurrency"
      | "gift_card"
      | "apple_pay"
      | "google_pay"
      | "alipay"
      | "wechat_pay"
      | "sepa"
      | "ach"
      | "bacs"
      | "klarna"
      | "afterpay"
      | "paylater"
      | "shop_pay"
    )[],
    startDate: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString() as string & tags.Format<"date-time">,
    endDate: new Date().toISOString() as string & tags.Format<"date-time">,
    currency: RandomGenerator.sample(
      ["USD", "EUR", "KRW", "JPY", "GBP", "CAD", "AUD"],
      2,
    ) as (string & tags.Pattern<"^[A-Z]{3}$">)[],
    sortBy: "createdAt" as "createdAt" | "amount" | "status" | "paymentMethod",
    sortOrder: "desc" as "asc" | "desc",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrderPayment.IRequest;
  // Step 3: Call analytics endpoint with admin connection
  const result: IPageIShoppingMallOrderPayment.ISummary =
    await api.functional.shoppingMall.admin.analytics.order_payments.index(
      adminConnection,
      { body: request },
    );
  typia.assert(result);
  // Step 4: Validate pagination structure
  TestValidator.equals(
    "pagination: current page is number",
    result.pagination.current,
    result.pagination.current,
  );
  TestValidator.equals(
    "pagination: limit is number",
    result.pagination.limit,
    result.pagination.limit,
  );
  TestValidator.equals(
    "pagination: records is number",
    result.pagination.records,
    result.pagination.records,
  );
  TestValidator.equals(
    "pagination: pages is number",
    result.pagination.pages,
    result.pagination.pages,
  );
  // Step 5: Validate data structure
  TestValidator.predicate(
    "data array has at least one item",
    result.data.length > 0,
  );
  // Step 6: Validate individual summary items
  const firstPayment = result.data[0];
  TestValidator.equals(
    "payment id is string",
    firstPayment.id,
    firstPayment.id,
  );
  TestValidator.equals(
    "order_id is string",
    firstPayment.order_id,
    firstPayment.order_id,
  );
  TestValidator.equals(
    "payment_intent_id is string",
    firstPayment.payment_intent_id,
    firstPayment.payment_intent_id,
  );
  TestValidator.equals(
    "amount is number",
    firstPayment.amount,
    firstPayment.amount,
  );
  TestValidator.equals(
    "currency is string",
    firstPayment.currency,
    firstPayment.currency,
  );
  TestValidator.equals(
    "status is string",
    firstPayment.status,
    firstPayment.status,
  );
  TestValidator.equals(
    "payment_method is string",
    firstPayment.payment_method,
    firstPayment.payment_method,
  );
  TestValidator.equals(
    "gateway is string",
    firstPayment.gateway,
    firstPayment.gateway,
  );
  TestValidator.equals(
    "created_at is string",
    firstPayment.created_at,
    firstPayment.created_at,
  );
  TestValidator.equals(
    "updated_at is string",
    firstPayment.updated_at,
    firstPayment.updated_at,
  );
  // Step 7: Validate unauthorized access
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user should be blocked from analytics",
    async () => {
      await api.functional.shoppingMall.admin.analytics.order_payments.index(
        guestConnection,
        { body: request },
      );
    },
  );
}
