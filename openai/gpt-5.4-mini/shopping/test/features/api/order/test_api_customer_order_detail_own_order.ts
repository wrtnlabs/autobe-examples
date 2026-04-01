import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_detail_own_order(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: authorized.id,
    },
  );
  typia.assert(order);
  TestValidator.equals("owning customer id", order.customer.id, authorized.id);
  TestValidator.equals(
    "owning customer email",
    order.customer.email,
    authorized.email,
  );
  TestValidator.predicate("order number present", order.orderNumber.length > 0);
  TestValidator.predicate("order status present", order.status.length > 0);
  TestValidator.predicate(
    "total amount is non-negative",
    order.totalAmount >= 0,
  );
  TestValidator.predicate(
    "recipient name preserved",
    order.recipientName.length > 0,
  );
  TestValidator.predicate(
    "recipient phone preserved",
    order.recipientPhone.length > 0,
  );
  TestValidator.predicate(
    "street address preserved",
    order.streetAddress.length > 0,
  );
  TestValidator.predicate("city preserved", order.city.length > 0);
  TestValidator.predicate(
    "state or province preserved",
    order.stateProvince.length > 0,
  );
  TestValidator.predicate("postal code preserved", order.postalCode.length > 0);
  TestValidator.predicate("country preserved", order.country.length > 0);
}
