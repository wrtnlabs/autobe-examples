import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_cart_item_update_quantity_updates_subtotal_and_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member auth
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Seller-owned product with active variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: `sku-${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: `v-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          option_value: RandomGenerator.pick([
            "Red",
            "Blue",
            "Green",
            "Black",
            "White",
          ] as const),
          price: typia.random<number>(),
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3) Create cart
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    {},
  );
  typia.assert(cart);
  // 4) Add cart item
  const initialQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
        body: {
          shoppingMallProductVariantId: variant.id,
          quantity: initialQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals("cartId matches", cartItem.shoppingMallCartId, cart.id);
  TestValidator.equals(
    "subtotal equals variant price * quantity",
    cartItem.subtotalAmount,
    variant.price * cartItem.quantity,
  );
  const previousUpdatedAt = cartItem.updatedAt;
  // 5) Update cart item quantity to a higher value
  const updatedQuantity = (cartItem.quantity + 1) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const updated =
    await api.functional.shoppingMall.member.carts.items.updateCartItem(
      memberConnection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
        body: {
          quantity: updatedQuantity,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updated);
  // Validations
  TestValidator.equals("same cartItemId", updated.id, cartItem.id);
  TestValidator.equals("same cartId", updated.shoppingMallCartId, cart.id);
  TestValidator.equals("quantity updated", updated.quantity, updatedQuantity);
  TestValidator.equals(
    "subtotal updated",
    updated.subtotalAmount,
    variant.price * updatedQuantity,
  );
  TestValidator.notEquals(
    "updatedAt should change",
    updated.updatedAt,
    previousUpdatedAt,
  );
}
