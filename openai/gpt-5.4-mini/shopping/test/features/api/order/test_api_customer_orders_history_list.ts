import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_history_list(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(auth);
  const response = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "response page current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "response page limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "response records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "response pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "each order summary should contain only lightweight summary fields",
    response.data.every(
      (order) =>
        Object.keys(order).length === 5 &&
        "id" in order &&
        "orderNumber" in order &&
        "status" in order &&
        "totalAmount" in order &&
        "createdAt" in order,
    ),
  );
  TestValidator.predicate(
    "order history should be sorted newest first by createdAt",
    response.data.every(
      (order, index, array) =>
        index === 0 ||
        new Date(array[index - 1].createdAt).getTime() >=
          new Date(order.createdAt).getTime(),
    ),
  );
  if (response.data.length > 0) {
    TestValidator.predicate(
      "summary should not include nested order items",
      !("items" in response.data[0]),
    );
    TestValidator.predicate(
      "summary should not include shipments",
      !("shipments" in response.data[0]),
    );
    TestValidator.predicate(
      "summary should not include shipping address",
      !("shippingAddress" in response.data[0]),
    );
  }
}
