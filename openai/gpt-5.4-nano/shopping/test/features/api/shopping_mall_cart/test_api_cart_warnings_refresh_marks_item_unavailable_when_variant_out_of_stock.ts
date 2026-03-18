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

export async function test_api_cart_warnings_refresh_marks_item_unavailable_when_variant_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  };
  const member = await authorize_member_join(memberConnection, credentials);
  typia.assert(member);

  // 2) Create a cart container for the authenticated member
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(cart);

  // 3) Add a cart item referencing a specific product variant
  const cartItem = await generate_random_shopping_mall_member_carts_items_create(
    memberConnection,
    {
      params: { cartId: cart.id },
      body: {
        quantity: 1,
      },
    },
  );
  typia.assert(cartItem);

  // 4) Establish baseline by refreshing cart warnings
  const baselineProps = typia.assert<IShoppingMallCart.ISummary>({
    id: cart.id,
    warning_inventory_insufficient: false,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
    deleted_at: cart.deleted_at,
  } as unknown as IShoppingMallCart.ISummary);

  const baseline = await api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings(
    memberConnection,
    baselineProps as unknown as Parameters<
      typeof api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings
    >[1],
  );
  typia.assert(baseline);

  TestValidator.equals(
    "cart should not have inventory insufficient warning",
    baseline.warning_inventory_insufficient,
    false,
  );

  // 6) Simulate inventory change for the SAME product variant so it becomes out of stock
  const outOfStockRecord = await generate_random_shopping_mall_member_inventory_records_create(
    memberConnection,
    {
      body: {
        shopping_mall_product_variant_id:
          cartItem.shoppingMallProductVariantId,
        stock_quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  typia.assert(outOfStockRecord);

  // 7) Refresh again
  const refreshedProps = typia.assert<IShoppingMallCart.ISummary>({
    id: cart.id,
    warning_inventory_insufficient: true,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
    deleted_at: cart.deleted_at,
  } as unknown as IShoppingMallCart.ISummary);

  const refreshed = await api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings(
    memberConnection,
    refreshedProps as unknown as Parameters<
      typeof api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings
    >[1],
  );
  typia.assert(refreshed);

  TestValidator.equals(
    "cart should have inventory insufficient warning after variant out of stock",
    refreshed.warning_inventory_insufficient,
    true,
  );
}
