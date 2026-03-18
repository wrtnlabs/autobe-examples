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

export async function test_api_cart_item_update_cross_customer_is_rejected_and_does_not_mutate_state(
  connection: api.IConnection,
): Promise<void> {
  // --- 1) Member A: create product+variant, cart, and owning cart item ---
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });

  const productA = await generate_random_shopping_mall_member_products_create_product(
    memberAConnection,
    {},
  );
  typia.assert(productA);

  const variantA = await generate_random_shopping_mall_member_product_variants_create(
    memberAConnection,
    {
      body: {
        shopping_mall_product_id: productA.id,
        is_active: true,
      },
    },
  );
  typia.assert(variantA);

  const cartA = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cartA);

  const cartItemA = await generate_random_shopping_mall_member_carts_items_create(
    memberAConnection,
    {
      params: {
        cartId: cartA.id,
      },
      body: {
        shoppingMallProductVariantId: variantA.id,
        quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  typia.assert(cartItemA);

  const quantityBefore = cartItemA.quantity;
  const subtotalBefore = cartItemA.subtotalAmount;
  const deletedAtBefore = cartItemA.deletedAt;

  // --- 2) Member B: join and create a separate cart ---
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });

  const cartB = await generate_random_shopping_mall_member_carts_create(
    memberBConnection,
    {},
  );
  typia.assert(cartB);

  const warningInventoryBefore = cartB.warning_inventory_insufficient;
  const deletedAtCartBBefore = cartB.deleted_at;

  // --- 3) Cross-customer update attempt (must be rejected) ---
  const crossUpdateQty = (quantityBefore + 1) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const crossUpdateBody: IShoppingMallCartItem.IUpdate = {
    quantity: crossUpdateQty,
    remove: false,
  };

  await TestValidator.error(
    "cross-customer cart item update must be rejected",
    async () => {
      await api.functional.shoppingMall.member.carts.items.updateCartItem(
        memberBConnection,
        {
          cartId: cartA.id,
          cartItemId: cartItemA.id,
          body: crossUpdateBody,
        },
      );
    },
  );

  // --- 4) Validate member A cart item state did not change ---
  const quantityAfter = (quantityBefore + 2) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const ownerUpdateBody: IShoppingMallCartItem.IUpdate = {
    quantity: quantityAfter,
    remove: false,
  };

  const updatedByOwner =
    await api.functional.shoppingMall.member.carts.items.updateCartItem(
      memberAConnection,
      {
        cartId: cartA.id,
        cartItemId: cartItemA.id,
        body: ownerUpdateBody,
      },
    );

  typia.assert(updatedByOwner);

  TestValidator.equals(
    "owner update sets quantity as requested",
    updatedByOwner.quantity,
    quantityAfter,
  );

  TestValidator.equals(
    "owner update sets subtotalAmount based on variant price",
    updatedByOwner.subtotalAmount,
    variantA.price * quantityAfter,
  );

  TestValidator.equals(
    "cart item is not deleted by updates",
    updatedByOwner.deletedAt,
    deletedAtBefore,
  );

  TestValidator.equals(
    "cross-customer baseline quantity still matches original",
    quantityBefore,
    cartItemA.quantity,
  );

  TestValidator.equals(
    "cross-customer baseline subtotal still matches original",
    subtotalBefore,
    cartItemA.subtotalAmount,
  );

  // --- 5) Validate member B cart state did not change (no side effects) ---
  TestValidator.equals(
    "member B cart warning flag unchanged",
    cartB.warning_inventory_insufficient,
    warningInventoryBefore,
  );

  TestValidator.equals(
    "member B cart deleted_at unchanged",
    cartB.deleted_at,
    deletedAtCartBBefore,
  );
}
