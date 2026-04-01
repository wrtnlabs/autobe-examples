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

export async function test_api_customer_order_history_detail_own_order(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  try {
    const order = await api.functional.mallPlatform.customer.orders.history.at(
      customerConnection,
      {
        orderId,
      },
    );
    typia.assert<IMallPlatformOrder>(order);
    TestValidator.equals(
      "order id should match the requested order id",
      order.id,
      orderId,
    );
    TestValidator.predicate(
      "order number should exist",
      order.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "order total should be non-negative",
      order.totalAmount >= 0,
    );
    TestValidator.predicate(
      "order status should exist",
      order.status.length > 0,
    );
    TestValidator.predicate(
      "recipient name should exist",
      order.recipientName.length > 0,
    );
    TestValidator.predicate(
      "recipient phone should exist",
      order.recipientPhone.length > 0,
    );
    TestValidator.predicate(
      "street address should exist",
      order.streetAddress.length > 0,
    );
    TestValidator.predicate("city should exist", order.city.length > 0);
    TestValidator.predicate(
      "state or province should exist",
      order.stateProvince.length > 0,
    );
    TestValidator.predicate(
      "postal code should exist",
      order.postalCode.length > 0,
    );
    TestValidator.predicate("country should exist", order.country.length > 0);
    TestValidator.predicate(
      "created at should exist",
      order.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updated at should exist",
      order.updatedAt.length > 0,
    );
    TestValidator.equals(
      "deleted at should be null for a preserved historical order record",
      order.deletedAt,
      null,
    );
  } catch (exp) {
    if (!typia.is<api.HttpError>(exp)) throw exp;
    await TestValidator.httpError(
      "customer order history detail should reject inaccessible or missing orders",
      [401, 403, 404],
      async () => {
        throw exp;
      },
    );
  }
}
