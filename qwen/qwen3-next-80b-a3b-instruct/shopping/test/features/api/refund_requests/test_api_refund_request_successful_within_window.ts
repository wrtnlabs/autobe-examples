import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_successful_within_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerJoin });
  const sellerLogin = {
    email: sellerJoin.email,
    password: sellerJoin.password,
  } satisfies IShoppingMallSeller.ILogin;
  await authorize_seller_login(sellerConnection, { body: sellerLogin });
  // 2. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerJoin });
  const customerLogin = {
    email: customerJoin.email,
    password: customerJoin.password,
  } satisfies IShoppingMallCustomer.ILogin;
  await authorize_customer_login(customerConnection, { body: customerLogin });
  // 3. Create a cart item to simulate product being added
  const cartCreate = {
    variant_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
    >(),
  } satisfies IShoppingMallCart.ICreate;
  const cartItem = await api.functional.shoppingMall.customer.cart.create(
    customerConnection,
    { body: cartCreate },
  );
  typia.assert(cartItem);
  // Extract variant_id from the original cartCreate request (not from cartItem)
  // According to IShoppingMallCartItem, there's no variant_id property
  // The variant_id used is what was originally provided in the cart creation
  const cartItemId = cartCreate.variant_id;
  // 4. Create shipment to simulate delivery of the item
  const shipment = {
    carrier_name: "FedEx",
    tracking_number: "1234567890",
    order_item_ids: [cartItemId],
  } satisfies IShoppingMallShipment.ICreate;
  await api.functional.shoppingMall.seller.shipments.create(sellerConnection, {
    body: shipment,
  });
  // 5. Submit refund request with valid reason within 7-day window
  const reason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 15,
  }) satisfies string & tags.MinLength<10> & tags.MaxLength<500>;
  const refundRequestCreate = {
    order_item_id: cartItemId,
    reason,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest =
    await api.functional.shoppingMall.customer.refund_requests.create(
      customerConnection,
      { body: refundRequestCreate },
    );
  typia.assert(refundRequest);
  // 6. Validate refund request properties
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request reason matches",
    refundRequest.reason,
    reason,
  );
  TestValidator.notEquals(
    "refund request has generated id",
    refundRequest.id,
    "",
  );
  TestValidator.predicate(
    "refund request created_at is valid",
    () => !isNaN(Date.parse(refundRequest.created_at)),
  );
  TestValidator.predicate(
    "refund request updated_at is valid",
    () => !isNaN(Date.parse(refundRequest.updated_at)),
  );
  TestValidator.equals(
    "refund request order_item_id matches",
    refundRequest.order_item_id,
    cartItemId,
  );
  // Extract customer_id from Authorization header safely
  const authHeader = customerConnection.headers?.Authorization;
  const userId =
    authHeader && typeof authHeader === "string"
      ? JSON.parse(atob(authHeader.split(" ")[1].split(".")[1])).id
      : "";
  TestValidator.equals(
    "refund request customer_id matches",
    refundRequest.customer_id,
    userId,
  );
}
