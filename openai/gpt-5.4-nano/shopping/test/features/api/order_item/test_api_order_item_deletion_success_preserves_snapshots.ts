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
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_item_deletion_success_preserves_snapshots(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;

  const auth = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(auth);

  const product =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      {},
    );
  typia.assert(product);

  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {
        body: {
          ...(typia.random<IShoppingMallProductVariant.ICreate>() satisfies
            IShoppingMallProductVariant.ICreate),
          shopping_mall_product_id: product.id,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  const cart =
    await generate_random_shopping_mall_member_carts_create(memberConnection, {
      body: null,
    } as any);
  typia.assert(cart);

  await generate_random_shopping_mall_member_carts_items_create(
    memberConnection,
    {
      params: { cartId: cart.id },
      body: {
        shoppingMallProductVariantId: variant.id,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );

  const address =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {},
    );
  typia.assert(address);

  await api.functional.shoppingMall.member.addresses.lock_for_checkout.lockForCheckout(
    memberConnection,
    {
      addressId: address.id,
    },
  );

  const order =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {});
  typia.assert(order);

  const orderItems = order.orderItems;
  TestValidator.predicate(
    "order has at least 1 order item",
    () => orderItems.length >= 1,
  );

  const targetOrderItem = orderItems[0];
  const targetOrderItemId = targetOrderItem.id;

  await api.functional.shoppingMall.member.order_items.erase(memberConnection, {
    orderItemId: targetOrderItemId,
  });

  await TestValidator.error(
    "second deletion of the same order item should fail",
    async () => {
      await api.functional.shoppingMall.member.order_items.erase(
        memberConnection,
        { orderItemId: targetOrderItemId },
      );
    },
  );

  if (orderItems.length >= 2) {
    const anotherOrderItem = orderItems[1];
    await api.functional.shoppingMall.member.order_items.erase(
      memberConnection,
      { orderItemId: anotherOrderItem.id },
    );
  }
}
