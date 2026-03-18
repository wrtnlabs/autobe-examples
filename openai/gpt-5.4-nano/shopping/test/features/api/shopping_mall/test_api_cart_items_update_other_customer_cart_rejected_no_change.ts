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

export async function test_api_cart_items_update_other_customer_cart_rejected_no_change(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Create a product variant owned by member A
  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      memberAConnection,
      {},
    );
  typia.assert(variant);
  // Create cart for member A
  const cartA = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cartA);
  // Add an active cart item to cartA
  const originalQuantity = 2 satisfies number;
  const cartItemA =
    await generate_random_shopping_mall_member_carts_items_create(
      memberAConnection,
      {
        params: { cartId: cartA.id },
        body: {
          shoppingMallProductVariantId: variant.id,
          quantity: originalQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);
  // Baseline: capture the cart item summary via an idempotent update by member A
  const baselineSummaryA =
    await api.functional.shoppingMall.member.carts.items.updateCartItems(
      memberAConnection,
      {
        cartId: cartA.id,
        body: typia.random<IShoppingMallCartItem.IRequest>(),
      },
    );
  typia.assert(baselineSummaryA);
  // 2) Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 3) Unauthorized update attempt by member B
  await TestValidator.error(
    "other customer cart item update should be rejected",
    async () => {
      await api.functional.shoppingMall.member.carts.items.updateCartItems(
        memberBConnection,
        {
          cartId: cartA.id,
          body: typia.random<IShoppingMallCartItem.IRequest>(),
        },
      );
    },
  );
  // 4) Verify cart item state is unchanged for the cart item in cartA (by capturing summary again)
  const afterSummaryA =
    await api.functional.shoppingMall.member.carts.items.updateCartItems(
      memberAConnection,
      {
        cartId: cartA.id,
        body: typia.random<IShoppingMallCartItem.IRequest>(),
      },
    );
  typia.assert(afterSummaryA);
  // Compare only stable business-relevant fields (timestamps may change)
  TestValidator.equals(
    "cartA item id should remain unchanged",
    afterSummaryA.id,
    baselineSummaryA.id,
  );
  TestValidator.equals(
    "cartA item variant should remain unchanged",
    afterSummaryA.shopping_mall_product_variant_id,
    baselineSummaryA.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "cartA item quantity should remain unchanged",
    afterSummaryA.quantity,
    baselineSummaryA.quantity,
  );
  TestValidator.equals(
    "cartA item subtotal_amount should remain unchanged",
    afterSummaryA.subtotal_amount,
    baselineSummaryA.subtotal_amount,
  );
  TestValidator.equals(
    "cartA item deleted_at should remain unchanged",
    afterSummaryA.deleted_at,
    baselineSummaryA.deleted_at,
  );
}
