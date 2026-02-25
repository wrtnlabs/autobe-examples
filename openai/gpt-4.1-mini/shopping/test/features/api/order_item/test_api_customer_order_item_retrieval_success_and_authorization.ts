import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_retrieval_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner customer and authorize
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPass123!",
    },
  });
  ownerConnection.headers = { Authorization: ownerAuthorized.token.access };
  typia.assert(ownerAuthorized);
  // 2. Register another customer and authorize
  const anotherConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_customer_join(anotherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AnotherPass123!",
    },
  });
  anotherConnection.headers = { Authorization: anotherAuthorized.token.access };
  typia.assert(anotherAuthorized);
  // NOTE:
  // No creation API for orders or order items is provided,
  // so we cannot reliably create an order item owned by owner customer.
  // By specifications, we test retrieval of order item via API and authorization enforcement.
  // Here, we generate a random valid UUID for orderItemId
  // This test assumes orderItemId is a valid existing order item ID owned by owner customer for positive test.
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Owner fetches their order item
  const orderItem = await api.functional.shoppingMall.customer.order_items.at(
    ownerConnection,
    {
      orderItemId,
    },
  );
  typia.assert(orderItem);
  // Validate returned data has essential fields
  TestValidator.predicate(
    "order item quantity positive",
    orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item status is valid",
    typeof orderItem.status === "string" && orderItem.status.length > 0,
  );
  TestValidator.predicate(
    "order summary present",
    orderItem.order !== null && orderItem.order !== undefined,
  );
  TestValidator.predicate(
    "product variant present",
    orderItem.productVariant !== null && orderItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "createdAt is string",
    typeof orderItem.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is string",
    typeof orderItem.updatedAt === "string",
  );
  // 4. Unauthorized customer tries to fetch same order item, expect 403 forbidden
  await TestValidator.httpError("unauthorized access denied", 403, async () => {
    await api.functional.shoppingMall.customer.order_items.at(
      anotherConnection,
      {
        orderItemId,
      },
    );
  });
}
