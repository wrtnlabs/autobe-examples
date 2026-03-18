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
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_cart_items_update_subtotal_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerAuth);

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.member.carts.create(customerConnection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(sellerAuth);

  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          code: RandomGenerator.alphabets(10),
          title: RandomGenerator.name(),
          option_value: RandomGenerator.name(),
          price: typia.random<number>(),
          is_active: true,
        } satisfies DeepPartial<IShoppingMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);

  const initialQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  let newQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  while (newQuantity === initialQuantity) {
    newQuantity = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >();
  }

  const cartItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      customerConnection,
      {
        params: {
          cartId: cart.id,
        },
        body: {
          shoppingMallProductVariantId: variant.id,
          quantity: initialQuantity,
        } satisfies DeepPartial<IShoppingMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem);

  const updatedItem: IShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.member.carts.items.updateCartItems(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          items: typia.assert<Array<IShoppingMallCartItem.IRequestItem>>([
            {
              shopping_mall_cart_item_id: cartItem.id,
              quantity: newQuantity,
            },
          ]),
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );

  typia.assert(updatedItem);

  TestValidator.equals("quantity updated", updatedItem.quantity, newQuantity);
  TestValidator.equals(
    "subtotal recalculated",
    updatedItem.subtotal_amount,
    variant.price * newQuantity,
  );
  TestValidator.notEquals(
    "updatedAt changed",
    cartItem.updatedAt,
    updatedItem.updated_at,
  );
  TestValidator.equals("deletedAt remains null", updatedItem.deleted_at, null);
}
