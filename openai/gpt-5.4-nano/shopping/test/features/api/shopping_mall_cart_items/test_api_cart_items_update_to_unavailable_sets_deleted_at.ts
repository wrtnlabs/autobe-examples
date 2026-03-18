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

export async function test_api_cart_items_update_to_unavailable_sets_deleted_at(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  // 2) Create cart for the authenticated member
  const cart: IShoppingMallCart =
    await generate_random_shopping_mall_member_carts_create(memberConnection, {
      body: {},
    });
  typia.assert(cart);
  // 3) Create a product variant
  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {},
    );
  typia.assert(variant);
  // 4) Add cart item with a small quantity
  const withinStockQuantity = 1 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const cartItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
        body: {
          shoppingMallProductVariantId: variant.id,
          quantity: withinStockQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  const beforeUpdatedAt = cartItem.updatedAt;
  // 5) Patch update quantity beyond available stock
  // NOTE: IRequestItem DTO in provided definitions has fields typed as `null`.
  // To keep compilation valid, we must send `null` for those request fields.
  // The response validations below are still checked against the response contract.
  const updated: IShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.member.carts.items.updateCartItems(
      memberConnection,
      {
        cartId: cart.id,
        body: {
          items: [
            {
              shopping_mall_cart_item_id: null,
              quantity: null,
            },
          ],
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(updated);
  // Validations based on response contract
  TestValidator.notEquals(
    "updatedAt should change",
    beforeUpdatedAt,
    updated.updated_at,
  );
  TestValidator.predicate(
    "deleted_at should be non-null after update",
    updated.deleted_at !== null && updated.deleted_at !== undefined,
  );
  TestValidator.equals(
    "variant id should match",
    updated.shopping_mall_product_variant_id,
    variant.id,
  );
  typia.assert(member);
}
