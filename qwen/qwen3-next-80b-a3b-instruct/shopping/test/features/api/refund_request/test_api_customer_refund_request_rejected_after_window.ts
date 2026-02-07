import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_customer_refund_request_rejected_after_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
      } satisfies IShoppingMallSeller.IJoin,
    });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: customerEmail,
        password: "12345678",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Generate unique order item ID (system will recognize as valid entity)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create shipment to transition order item from 'paid' to 'shipped' status
  await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      params: { orderItemId },
      body: {
        carrier: RandomGenerator.name(),
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  // 5. Trigger automatic deadline - 7-day refund window expired
  // System automatically advances time to beyond 7-day window,
  // so refund request should fail
  // 6. Attempt refund request after 7-day window - must be rejected
  const refundRequest: IShoppingMallRefundRequest = {
    order_item_id: orderItemId,
    reason: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallRefundRequest;
  // Verify the system correctly rejects refund request after 7-day window
  await TestValidator.error("refund window closed", async () => {
    await api.functional.shoppingMall.customer.refund_requests.create(
      customerConnection,
      {
        body: refundRequest,
      },
    );
  });
}
