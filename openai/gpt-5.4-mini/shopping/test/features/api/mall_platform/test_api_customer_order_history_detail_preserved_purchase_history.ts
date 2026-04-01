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

export async function test_api_customer_order_history_detail_preserved_purchase_history(
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
  const orderId = connection.headers?.["x-order-id"];
  TestValidator.predicate(
    "order id fixture must be supplied through x-order-id header",
    typeof orderId === "string" && orderId.length > 0,
  );
  const orderIdString = orderId as string;
  const order = await api.functional.mallPlatform.customer.orders.history.at(
    customerConnection,
    {
      orderId: orderIdString as string & tags.Format<"uuid">,
    },
  );
  typia.assert(order);
  TestValidator.equals(
    "customer id should match the authenticated customer",
    order.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email should match the authenticated customer",
    order.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "order id should match the requested id",
    order.id,
    orderIdString,
  );
  TestValidator.predicate(
    "order number should be present",
    order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "order status should be present",
    order.status.length > 0,
  );
  TestValidator.predicate(
    "total amount should be non-negative",
    order.totalAmount >= 0,
  );
  TestValidator.predicate(
    "recipient name should be present",
    order.recipientName.length > 0,
  );
  TestValidator.predicate(
    "recipient phone should be present",
    order.recipientPhone.length > 0,
  );
  TestValidator.predicate(
    "street address should be present",
    order.streetAddress.length > 0,
  );
  TestValidator.predicate("city should be present", order.city.length > 0);
  TestValidator.predicate(
    "state or province should be present",
    order.stateProvince.length > 0,
  );
  TestValidator.predicate(
    "postal code should be present",
    order.postalCode.length > 0,
  );
  TestValidator.predicate(
    "country should be present",
    order.country.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be a valid historical timestamp",
    order.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be a valid historical timestamp",
    order.updatedAt.length > 0,
  );
  TestValidator.equals(
    "deletedAt should remain null for an active historical record",
    order.deletedAt,
    null,
  );
}
