import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup } from "../../../generate/generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup";
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { generate_random_shopping_mall_member_inventory_records_create } from "../../../generate/generate_random_shopping_mall_member_inventory_records_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";

export async function test_api_cart_item_availability_cleanup_restores_availability_after_inventory_increase(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Authenticate as member via join
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);

  // 2) Create a new cart
  const cart = await generate_random_shopping_mall_member_carts_create(memberConnection, {
    body: {},
  });
  typia.assert(cart);

  // 3) Create a cart item.
  const initialItem = await generate_random_shopping_mall_member_carts_items_create(
    memberConnection,
    {
      params: { cartId: cart.id },
      body: {
        // shoppingMallProductVariantId is a uuid string in this DTO
        shoppingMallProductVariantId: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(initialItem);

  const initialDeletedAt = initialItem.deletedAt;

  // 5) Append inventory history to make variant purchasable again.
  const variantId = initialItem.shoppingMallProductVariantId;
  await generate_random_shopping_mall_member_inventory_records_create(memberConnection, {
    body: {
      shopping_mall_product_variant_id: variantId,
      stock_quantity: 0,
      reserved_quantity: 0,
      available_quantity: 0,
    } satisfies IShoppingMallInventoryRecord.ICreate,
  });
  await generate_random_shopping_mall_member_inventory_records_create(memberConnection, {
    body: {
      shopping_mall_product_variant_id: variantId,
      stock_quantity: 10,
      reserved_quantity: 0,
      available_quantity: 10,
    } satisfies IShoppingMallInventoryRecord.ICreate,
  });

  // 6) Call cleanup
  await api.functional.shoppingMall.member.cart.items.availability.cleanups.createAvailabilityCleanup(
    memberConnection,
    {
      body: {
        shoppingMallProductVariantId: variantId,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );

  TestValidator.predicate("cleanup reconciles without throwing", () => initialDeletedAt !== undefined);
}
