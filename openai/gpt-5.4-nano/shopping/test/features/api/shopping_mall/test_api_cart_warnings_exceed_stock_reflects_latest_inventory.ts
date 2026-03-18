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
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { generate_random_shopping_mall_member_inventory_records_create } from "../../../generate/generate_random_shopping_mall_member_inventory_records_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";

export async function test_api_cart_warnings_exceed_stock_reflects_latest_inventory(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(credentials);
  // Create cart
  const cart = await api.functional.shoppingMall.member.carts.create(
    memberConnection,
    { body: {} satisfies IShoppingMallCart.ICreate },
  );
  typia.assert(cart);
  const cartItemQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  // Create an inventory record with low available quantity first.
  // We will use the returned variant id to create the cart item.
  const lowStockAvailable = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const inventoryLow =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          stock_quantity: (lowStockAvailable + 5) satisfies number as number,
          reserved_quantity: 0,
          available_quantity: lowStockAvailable,
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryLow);
  // Ensure exceed-stock condition: cart item quantity > current available quantity.
  const exceedQuantity =
    cartItemQuantity > lowStockAvailable
      ? cartItemQuantity
      : lowStockAvailable + 1;
  const cartItem = await api.functional.shoppingMall.member.carts.items.create(
    memberConnection,
    {
      cartId: cart.id,
      body: {
        shoppingMallProductVariantId:
          inventoryLow.shopping_mall_product_variant_id,
        quantity: exceedQuantity satisfies number as number as any,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Read warnings (should include exceed-stock)
  const warnings1 =
    await api.functional.shoppingMall.member.cart.warnings.atCartWarnings(
      memberConnection,
    );
  typia.assert(warnings1);
  TestValidator.predicate(
    "cart warning flag should be true when quantity exceeds available stock",
    warnings1.warning_inventory_insufficient === true,
  );
  // Update inventory: make available quantity >= cart item quantity
  const highAvailable =
    lowStockAvailable >= exceedQuantity ? lowStockAvailable : exceedQuantity;
  await generate_random_shopping_mall_member_inventory_records_create(
    memberConnection,
    {
      body: {
        shopping_mall_product_variant_id:
          inventoryLow.shopping_mall_product_variant_id,
        stock_quantity: (highAvailable + 5) satisfies number as number,
        reserved_quantity: 0,
        available_quantity: highAvailable,
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  const warnings2 =
    await api.functional.shoppingMall.member.cart.warnings.atCartWarnings(
      memberConnection,
    );
  typia.assert(warnings2);
  TestValidator.predicate(
    "cart warning flag should be false after inventory is updated to satisfy quantity",
    warnings2.warning_inventory_insufficient === false,
  );
}
