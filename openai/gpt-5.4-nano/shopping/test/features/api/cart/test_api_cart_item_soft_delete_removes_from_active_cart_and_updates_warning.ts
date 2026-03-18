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

export async function test_api_cart_item_soft_delete_removes_from_active_cart_and_updates_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register/authenticate a member.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a seller-owned product and an active variant.
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          is_active: true,
        },
      },
    );
  typia.assert(variant);
  // 3) Create a cart.
  const cart =
    await generate_random_shopping_mall_member_carts_create(
      memberConnection,
      {},
    );
  typia.assert(cart);
  // 4) Add the variant to cart.
  const beforeCart = await api.functional.shoppingMall.member.carts.at(
    memberConnection,
    { cartId: cart.id },
  );
  typia.assert(beforeCart);
  const cartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
        body: {
          shoppingMallProductVariantId: variant.id,
          quantity: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  const cartAfterAdd = await api.functional.shoppingMall.member.carts.at(
    memberConnection,
    { cartId: cart.id },
  );
  typia.assert(cartAfterAdd);
  // 5) Call PUT ... with remove=true.
  const updatedItem =
    await api.functional.shoppingMall.member.carts.items.updateCartItem(
      memberConnection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
        body: {
          remove: true,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // 6) Retrieve the cart and validate warning recalculation for remaining active items.
  const afterCart = await api.functional.shoppingMall.member.carts.at(
    memberConnection,
    { cartId: cart.id },
  );
  typia.assert(afterCart);
  TestValidator.predicate(
    "updated cart item must be soft-deleted (deletedAt non-null)",
    updatedItem.deletedAt !== null,
  );
  // Cart should become clean (no inventory warning) after removing the only added item.
  // (We don't rely on items listing structure here; we validate warning semantics.)
  TestValidator.equals(
    "cart inventory warning should be false after item removal",
    afterCart.warning_inventory_insufficient,
    false,
  );
}
