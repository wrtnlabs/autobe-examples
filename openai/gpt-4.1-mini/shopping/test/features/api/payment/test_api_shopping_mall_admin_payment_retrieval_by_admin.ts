import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

export async function test_api_shopping_mall_admin_payment_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Authenticate as an admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: email,
        password: "AdminPass123!",
        ip: null,
        href: "https://example.com/admin/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Retrieve an existing payment by paymentId
  const paymentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.at(connection, {
      paymentId: paymentId,
    });
  typia.assert(payment);

  // Validate all main payment fields are present and match expected types
  TestValidator.predicate(
    "payment id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      payment.id,
    ),
  );
  TestValidator.equals("payment id matches requested", payment.id, paymentId);
  TestValidator.predicate(
    "shopping mall order id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      payment.shopping_mall_order_id,
    ),
  );
  TestValidator.predicate(
    "payment method is non-empty string",
    typeof payment.payment_method === "string" &&
      payment.payment_method.length > 0,
  );
  TestValidator.predicate(
    "payment status is non-empty string",
    typeof payment.payment_status === "string" &&
      payment.payment_status.length > 0,
  );
  TestValidator.predicate(
    "payment amount is non-negative number",
    typeof payment.payment_amount === "number" && payment.payment_amount >= 0,
  );
  TestValidator.predicate(
    "transaction id is non-empty string",
    typeof payment.transaction_id === "string" &&
      payment.transaction_id.length > 0,
  );
  TestValidator.predicate(
    "payment date is ISO 8601 date-time",
    !isNaN(Date.parse(payment.payment_date)),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    !isNaN(Date.parse(payment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    !isNaN(Date.parse(payment.updated_at)),
  );
  if (payment.deleted_at !== null && payment.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 date-time when present",
      !isNaN(Date.parse(payment.deleted_at)),
    );
  }
}
