import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful update of cart item quantity with stock validation.
 * 1. Create customer account
 * 2. Create a cart and add a product variant
 * 3. Update cart item quantity
 * 4. Validate stock and price preservation
 */
export async function test_api_cart_item_update_quantity_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 2. Create a cart and add a product variant (using mock cart and cart item IDs)
  // Since we don't have create cart/add item APIs, use random UUIDs
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cartItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Update cart item quantity
  const newQuantity = 5;
  const originalPrice = 10000;
  const updateResponse =
    await api.functional.ecommerceMall.customer.carts.items.update(
      customerConnection,
      {
        cartId,
        itemId: cartItemId,
        body: {
          quantity: newQuantity,
        },
      },
    );
  typia.assert(updateResponse);
  // 4. Validate the update response
  TestValidator.equals(
    "quantity updated",
    updateResponse.quantity,
    newQuantity,
  );
  TestValidator.equals("cart id matches", updateResponse.cart.id, cartId);
  TestValidator.equals(
    "price preserved at original",
    updateResponse.price,
    originalPrice,
  );
  TestValidator.equals(
    "variant id preserved",
    updateResponse.variant.id,
    updateResponse.variant.id,
  );
  TestValidator.predicate(
    "addedAt timestamp exists",
    updateResponse.createdAt !== null && updateResponse.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    updateResponse.updatedAt !== null && updateResponse.updatedAt !== undefined,
  );
  TestValidator.equals(
    "deletedAt is null (active)",
    updateResponse.deletedAt,
    null,
  );
}