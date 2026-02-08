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

export async function test_api_customer_refund_request_create_invalid_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  // Authorize customer by joining a new account
  await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 2. Prepare refund request body with valid random reason
  const refundRequestBody = typia.random<IShoppingMallRefundRequest.ICreate>();
  // 3. Use a non-existent or invalid orderItemId (UUID format but not existing)
  const invalidOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to create refund request with invalid order item id
  // Expect the server to reject with an error
  await TestValidator.error(
    "refund request creation fails with invalid order item",
    async () => {
      await generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request(
        customerConnection,
        {
          params: { orderItemId: invalidOrderItemId },
          body: refundRequestBody,
        },
      );
    },
  );
}
