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

export async function test_api_cart_warnings_variant_unavailable_reflects_current_state(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member (cart owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Seller (separate identity)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2.2) Seller creates product
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphabets(10),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 2.3) Seller creates variant
  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: RandomGenerator.alphabets(10),
          title: RandomGenerator.name(2),
          option_value: RandomGenerator.alphabets(6),
          price: typia.random<
            number & tags.Type<"float"> & tags.Minimum<0.01>
          >(),
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3.1) Member creates cart
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(cart);
  // 3.2) Member adds cart item referencing variant
  const cartItem =
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
  typia.assert(cartItem);
  // 4.1) Seller deletes variant
  await api.functional.shoppingMall.member.productVariants.erase(
    sellerConnection,
    {
      productVariantId: variant.id,
    },
  );
  // 5) Call warnings
  const warningsAfterDelete =
    await api.functional.shoppingMall.member.cart.warnings.atCartWarnings(
      memberConnection,
    );
  typia.assert(warningsAfterDelete);
  // 6) Assert business expectations (cart-level, since DTO defines items as null)
  TestValidator.equals("cart id should match", warningsAfterDelete.id, cart.id);
  TestValidator.predicate(
    "cart has inventory warning after variant deletion",
    warningsAfterDelete.warning_inventory_insufficient === true,
  );
  // 7) Stability check: update quantity to 1 (within stock if variant were available)
  await api.functional.shoppingMall.member.carts.items.updateCartItem(
    memberConnection,
    {
      cartId: cart.id,
      cartItemId: cartItem.id,
      body: {
        quantity: 1,
      } satisfies IShoppingMallCartItem.IUpdate,
    },
  );
  // 8) Re-call warnings
  const warningsAfterQuantityUpdate =
    await api.functional.shoppingMall.member.cart.warnings.atCartWarnings(
      memberConnection,
    );
  typia.assert(warningsAfterQuantityUpdate);
  TestValidator.equals(
    "cart id should still match",
    warningsAfterQuantityUpdate.id,
    cart.id,
  );
  TestValidator.predicate(
    "cart remains inventory warning after quantity update",
    warningsAfterQuantityUpdate.warning_inventory_insufficient === true,
  );
}
