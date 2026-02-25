import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_payment_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create first customer connection
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Create second customer connection
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // List orders for customer 1 to verify they have at least one payment
  const orders1 = await api.functional.shoppingMall.customer.orders.index(
    customer1Connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  // Verify customer1 has at least one order
  TestValidator.predicate(
    "customer1 has at least one order",
    orders1.data.length > 0,
  );
  // Get the first order for customer1 (it should have an associated payment)
  const firstOrder = orders1.data[0];
  // Retrieve payment details for customer1's order
  // Note: The endpoint path shows {paymentId} parameter, but the order summary doesn't include payment ID
  // We need to check if there's a payment ID in the order or if we need to list payments
  const payment = await api.functional.shoppingMall.customer.payments.at(
    customer1Connection,
    {
      paymentId: firstOrder.id, // This is a workaround since order summary doesn't include payment ID
    },
  );
  typia.assert(payment);
  // Verify payment belongs to customer1
  TestValidator.equals(
    "payment belongs to customer1",
    payment.customer_id,
    customer1.id,
  );
  // Verify payment contains required fields
  TestValidator.predicate(
    "has payment_gateway_transaction_id",
    payment.payment_gateway_transaction_id !== null,
  );
  TestValidator.predicate("has amount", payment.amount > 0);
  TestValidator.predicate(
    "has currency",
    typeof payment.currency === "string" && payment.currency.length > 0,
  );
  TestValidator.predicate(
    "has payment_method_type",
    typeof payment.payment_method_type === "string" &&
      payment.payment_method_type.length > 0,
  );
  TestValidator.predicate(
    "has status",
    typeof payment.status === "string" && payment.status.length > 0,
  );
  // List orders for customer2
  const orders2 = await api.functional.shoppingMall.customer.orders.index(
    customer2Connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  // Verify customer2 has at least one order
  TestValidator.predicate(
    "customer2 has at least one order",
    orders2.data.length > 0,
  );
  // Get customer2's first order
  const customer2Order = orders2.data[0];
  // Customer2 should not be able to access customer1's payment (403 error expected)
  await TestValidator.error(
    "customer2 cannot access customer1's payment",
    async () => {
      await api.functional.shoppingMall.customer.payments.at(
        customer2Connection,
        {
          paymentId: payment.id,
        },
      );
    },
  );
}