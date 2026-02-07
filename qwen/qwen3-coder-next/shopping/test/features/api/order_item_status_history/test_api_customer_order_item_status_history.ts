import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_status_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Call status history endpoint with random order and item IDs
  const statusHistory =
    await api.functional.shoppingMall.customer.orders.items.status_history.statusHistory(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        itemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(statusHistory);
  // 3. Validate response structure
  TestValidator.predicate("has pagination", statusHistory.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(statusHistory.data));
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    statusHistory.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    statusHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    statusHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    statusHistory.pagination.pages >= 0,
  );
  // Validate data items (if any exist)
  if (statusHistory.data.length > 0) {
    TestValidator.predicate(
      "has at least one status record",
      statusHistory.data.length >= 1,
    );
    // Validate first status record structure
    const firstStatus = statusHistory.data[0];
    typia.assert(firstStatus);
  }
}
