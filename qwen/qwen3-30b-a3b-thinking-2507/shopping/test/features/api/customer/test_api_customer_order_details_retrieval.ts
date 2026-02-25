import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(20),
      href: "https://example.com",
      referrer: "https://example.com/signup",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve a random order (assuming it exists for this customer)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.ecommerce.customer.orders.at(
    customerConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  // 3. Validate order details
  TestValidator.equals("status indicates a valid order", order.status, "paid");
  TestValidator.predicate("total is positive", order.total_amount > 0);
  TestValidator.equals(
    "country is South Korea",
    order.shippingAddress.country,
    "South Korea",
  );
  TestValidator.equals("city is Seoul", order.shippingAddress.city, "Seoul");
  TestValidator.equals(
    "postal code is 06167",
    order.shippingAddress.postal_code,
    "06167",
  );
}