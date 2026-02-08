import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request";
import { generate_random_shopping_mall_order_item_snapshots_create } from "../../../generate/generate_random_shopping_mall_order_item_snapshots_create";
import { generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot } from "../../../generate/generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot";
import { prepare_random_shopping_mall_order_item_snapshot } from "../../../prepare/prepare_random_shopping_mall_order_item_snapshot";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_refund_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_refund_request_snapshot";

export async function test_api_customer_refund_request_create_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerAuth);
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Prepare a random UUID to simulate an owned order item ID
  const ownedOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit refund request for the owned order item
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request(
      customerConnection,
      {
        params: { orderItemId: ownedOrderItemId },
        body: {},
      },
    );
  typia.assert(refundRequest);
  // 4. Create refund request snapshot (audit log)
  const refundRequestSnapshot =
    await generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(refundRequestSnapshot);
  // 5. Try to submit refund request with non-owned orderItemId (different random UUID)
  await TestValidator.error(
    "not allow refund on non-owned order item",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request(
        customerConnection,
        {
          params: { orderItemId: typia.random<string & tags.Format<"uuid">>() },
          body: {},
        },
      );
    },
  );
  // 6. Try to submit refund request with an invalid order item ID (bad format)
  await TestValidator.error(
    "not allow refund with invalid order item ID",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request(
        customerConnection,
        {
          params: { orderItemId: "invalid-uuid-format" as unknown as string },
          body: {},
        },
      );
    },
  );
  // 7. Try refund submission without authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "not allow refund without authentication",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request(
        unauthenticatedConnection,
        {
          params: { orderItemId: ownedOrderItemId },
          body: {},
        },
      );
    },
  );
}
