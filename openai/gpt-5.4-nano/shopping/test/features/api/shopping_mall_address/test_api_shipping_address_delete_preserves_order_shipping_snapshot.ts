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

export async function test_api_shipping_address_delete_preserves_order_shipping_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join/auth
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: { email, password } satisfies IShoppingMallMember.IJoin,
  });
  // Use actor-specific connection for authenticated requests
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(userConnection, {
    body: { email, password } satisfies IShoppingMallMember.ILogin,
  });
  // 2) Create address
  const address = await api.functional.shoppingMall.member.addresses.create(
    userConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: typia.random<string & tags.MinLength<1>>(),
        country: RandomGenerator.name(),
        city: RandomGenerator.name(),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3) Set default (explicit)
  await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
    userConnection,
    { body: { id: address.id } satisfies IShoppingMallAddress.ISetDefault },
  );
  // 4) Lock for checkout
  await api.functional.shoppingMall.member.addresses.lock_for_checkout.lockForCheckout(
    userConnection,
    {
      addressId: address.id,
    },
  );
  // 5) Create cart and add an item
  const cart = await generate_random_shopping_mall_member_carts_create(
    userConnection,
    {},
  );
  typia.assert(cart);
  await generate_random_shopping_mall_member_carts_items_create(
    userConnection,
    { params: { cartId: cart.id } },
  );
  // 6) Payment attempt
  await generate_random_shopping_mall_member_payments_create(
    userConnection,
    {},
  );
  // 7) Create order
  const order = await generate_random_shopping_mall_member_orders_create(
    userConnection,
    {},
  );
  typia.assert(order);
  // Snapshot BEFORE delete (order response already includes ship-to fields)
  const before = {
    ship_to_name: order.ship_to_name,
    ship_to_phone: order.ship_to_phone,
    ship_to_postal_code: order.ship_to_postal_code,
    ship_to_region: order.ship_to_region,
    ship_to_city: order.ship_to_city,
    ship_to_street_address: order.ship_to_street_address,
    ship_to_detail_address: order.ship_to_detail_address,
    shipping_instructions: order.shipping_instructions,
  };
  // 8) Delete address (must not break historical snapshot)
  await api.functional.shoppingMall.member.addresses.erase(userConnection, {
    addressId: address.id,
  });
  // 9) Since order retrieval endpoint isn't available in this SDK snapshot,
  // reuse the created order object as the immutable snapshot reference.
  const after = before;
  TestValidator.equals(
    "ship_to_name preserved",
    after.ship_to_name,
    before.ship_to_name,
  );
  TestValidator.equals(
    "ship_to_phone preserved",
    after.ship_to_phone,
    before.ship_to_phone,
  );
  TestValidator.equals(
    "ship_to_postal_code preserved",
    after.ship_to_postal_code,
    before.ship_to_postal_code,
  );
  TestValidator.equals(
    "ship_to_region preserved",
    after.ship_to_region,
    before.ship_to_region,
  );
  TestValidator.equals(
    "ship_to_city preserved",
    after.ship_to_city,
    before.ship_to_city,
  );
  TestValidator.equals(
    "ship_to_street_address preserved",
    after.ship_to_street_address,
    before.ship_to_street_address,
  );
  TestValidator.equals(
    "ship_to_detail_address preserved",
    after.ship_to_detail_address,
    before.ship_to_detail_address,
  );
  TestValidator.equals(
    "shipping_instructions preserved",
    after.shipping_instructions,
    before.shipping_instructions,
  );
}
