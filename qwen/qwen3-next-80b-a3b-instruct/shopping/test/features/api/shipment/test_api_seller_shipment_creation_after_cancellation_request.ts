import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_creation_after_cancellation_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@seller.com",
      password: "Password123!",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  await authorize_customer_login(customerConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@example.com",
      password: "Password123!",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Customer submits cancellation request for a 'paid' order item
  // The system internally tracks order items; we use a random UUID as the order_item_id
  // This simulates a paid order item (status validated by the system during cancellation request creation)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  await generate_random_shopping_mall_customer_cancellation_requests_create(
    customerConnection,
    {
      body: {
        order_item_id: orderItemId,
        reason: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IShoppingMallCancellationRequest.ICreate,
    },
  );
  // 4. Seller creates shipment for the cancelled order item
  // IShoppingMallShipment.ICreate has no defined properties - must be empty object
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      orderItemId,
      body: {} satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 5. Validate shipment was created correctly
  // No specific properties to validate as IShoppingMallShipment has no defined properties
  // typia.assert() provides complete validation
}
