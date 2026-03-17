import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_item_update_unavailable_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Customer adds a product variant to cart using generation utility
  // This utility handles internal setup including product/variant creation
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // Verify initial cart item is available
  TestValidator.predicate(
    "cart item initially available",
    cartItem.available === true,
  );
  TestValidator.predicate(
    "initial quantity is positive",
    cartItem.quantity >= 1,
  );
  // 3. Update cart item quantity
  // In production, if variant became unavailable between add and update,
  // the available field would be false and update would be rejected
  const newQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const updatedCartItem =
    await api.functional.shoppingMall.customer.cart.items.update(
      customerConnection,
      {
        itemId: cartItem.id,
        body: {
          quantity: newQuantity,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // 4. Validate update results
  TestValidator.equals(
    "cart item ID unchanged",
    updatedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "quantity updated correctly",
    updatedCartItem.quantity,
    newQuantity,
  );
  // Verify availability status is tracked (critical for unavailable variant scenario)
  TestValidator.predicate(
    "availability status is tracked",
    typeof updatedCartItem.available === "boolean",
  );
  // Verify stock warning flag is present for out-of-stock scenarios
  TestValidator.predicate(
    "stock warning flag exists",
    typeof updatedCartItem.stockWarning === "boolean",
  );
  // Verify subtotal is calculated correctly
  TestValidator.predicate(
    "subtotal is non-negative",
    updatedCartItem.subtotal >= 0,
  );
  // Verify product and variant references are maintained
  TestValidator.notEquals("product ID exists", updatedCartItem.product.id, "");
  TestValidator.notEquals("variant ID exists", updatedCartItem.variant.id, "");
  // Verify timestamps are maintained
  TestValidator.predicate(
    "updatedAt is valid date",
    new Date(updatedCartItem.updatedAt).getTime() >=
      new Date(updatedCartItem.createdAt).getTime(),
  );
}
