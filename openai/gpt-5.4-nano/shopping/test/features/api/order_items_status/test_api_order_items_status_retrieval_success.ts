import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
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

export async function test_api_order_items_status_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join/auth
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const password = "Password-1234";
  const email = typia.random<string & tags.Format<"email">>();
  const member = await authorize_member_join(memberJoinConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = memberJoinConnection.headers;
  // 2.1) Shipping address + set default
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: "12345",
        country: "KR",
        city: "Seoul",
        street_line1: RandomGenerator.alphabets(10),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  await api.functional.shoppingMall.member.addresses._default.setDefaultAddress(
    memberConnection,
    {
      body: { id: address.id } satisfies IShoppingMallAddress.ISetDefault,
    },
  );
  // 2.2) Create cart
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(cart);
  // 2.3) Add two cart items (use generator defaults to avoid invalid variant ids)
  const cartItem1 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItem2);
  // 2.4) Initiate payment (use generator defaults)
  const payment = await generate_random_shopping_mall_member_payments_create(
    memberConnection,
    {},
  );
  typia.assert(payment);
  // 2.5) Create order from payment (use generator defaults to ensure required fields align)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 3) Retrieve per-item statuses (endpoint returns single order-item status per response DTO)
  const first =
    await api.functional.shoppingMall.member.orders.order_items.status.orderItemsStatus(
      memberConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.shoppingMall.member.orders.order_items.status.orderItemsStatus(
      memberConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(second);
  // Determinism check for the returned mapping portion (since response is a single order item DTO)
  TestValidator.equals("order item id mapping stable", first.id, second.id);
  TestValidator.equals(
    "order item line_item_status stable",
    first.lineItemStatus,
    second.lineItemStatus,
  );
}
