import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";

export async function test_api_member_order_detail_member_owned_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join / auth
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { ...(memberConnectionBase.headers ?? {}) };
  // 2) address + default
  const shippingAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          is_default: true,
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: typia.random<string>(),
          country: "KR",
          city: RandomGenerator.alphabets(6),
          street_line1: RandomGenerator.alphabets(12),
          street_line2: null,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);
  await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
    memberConnection,
    {
      body: {
        id: shippingAddress.id,
      } satisfies IShoppingMallAddress.ISetDefault,
    },
  );
  // 3) cart + item (use generator defaults to ensure variant/context validity)
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    {},
  );
  typia.assert(cart);
  const cartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
        body: {
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } as DeepPartial<IShoppingMallCartItem.ICreate> as IShoppingMallCartItem.ICreate,
      } as any,
    );
  typia.assert(cartItem);
  // 4) payment attempt (use generator defaults)
  const payment = await generate_random_shopping_mall_member_payments_create(
    memberConnection,
    {},
  );
  typia.assert(payment);
  // 5) create order (use generator defaults)
  const createdOrder = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(createdOrder);
  // 6) fetch order detail
  const fetched = await api.functional.shoppingMall.member.orders.at(
    memberConnection,
    { orderId: createdOrder.id },
  );
  typia.assert(fetched);
  // Validate header + ship-to details
  TestValidator.equals(
    "order_code matches",
    fetched.order_code,
    createdOrder.order_code,
  );
  TestValidator.equals(
    "ship_to_name matches",
    fetched.ship_to_name,
    createdOrder.ship_to_name,
  );
  TestValidator.equals(
    "ship_to_phone matches",
    fetched.ship_to_phone,
    createdOrder.ship_to_phone,
  );
  TestValidator.equals(
    "ship_to_postal_code matches",
    fetched.ship_to_postal_code,
    createdOrder.ship_to_postal_code,
  );
  TestValidator.equals(
    "ship_to_region matches",
    fetched.ship_to_region,
    createdOrder.ship_to_region,
  );
  TestValidator.equals(
    "ship_to_city matches",
    fetched.ship_to_city,
    createdOrder.ship_to_city,
  );
  TestValidator.equals(
    "ship_to_street_address matches",
    fetched.ship_to_street_address,
    createdOrder.ship_to_street_address,
  );
  TestValidator.equals(
    "ship_to_detail_address matches",
    fetched.ship_to_detail_address,
    createdOrder.ship_to_detail_address,
  );
  TestValidator.equals(
    "shipping_instructions matches",
    fetched.shipping_instructions,
    createdOrder.shipping_instructions,
  );
  // Collections exist
  TestValidator.predicate("has order items", fetched.orderItems.length > 0);
  TestValidator.predicate("has shipments", fetched.shipments.length > 0);
  // Items state consistency by id
  const expectedItemsById = new Map<
    string & tags.Format<"uuid">,
    IShoppingMallOrderItem.ISummary
  >();
  for (const item of createdOrder.orderItems) {
    expectedItemsById.set(item.id, item);
  }
  for (const gotItem of fetched.orderItems) {
    const expected = expectedItemsById.get(gotItem.id);
    if (!expected) {
      throw new Error(`Missing expected order item for id ${gotItem.id}`);
    }
    TestValidator.equals(
      "quantity matches",
      gotItem.quantity,
      expected.quantity,
    );
    TestValidator.equals(
      "seller_price_at_purchase matches",
      gotItem.seller_price_at_purchase,
      expected.seller_price_at_purchase,
    );
    TestValidator.equals(
      "placed_at matches",
      gotItem.placed_at,
      expected.placed_at,
    );
    TestValidator.equals(
      "line_item_status matches",
      gotItem.line_item_status,
      expected.line_item_status,
    );
  }
}
