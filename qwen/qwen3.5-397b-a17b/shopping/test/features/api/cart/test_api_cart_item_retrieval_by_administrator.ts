import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test that an administrator can successfully retrieve a specific cart item with complete details.
 *
 * Workflow:
 * 1. Register and authenticate as administrator
 * 2. Register and authenticate as customer
 * 3. Add a product variant to the customer's cart
 * 4. Administrator retrieves the specific cart item
 * 5. Validate response includes all required fields with correct structure
 */
export async function test_api_cart_item_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Customer setup - register and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Add product variant to customer's cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Administrator retrieves the cart item
  const retrievedItem =
    await api.functional.shoppingMall.administrator.carts.items.at(
      adminConnection,
      {
        cartId: cartItem.cart.id,
        itemId: cartItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 5. Validate cart item structure and data integrity
  TestValidator.equals("cart item ID matches", retrievedItem.id, cartItem.id);
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "price snapshot matches",
    retrievedItem.price,
    cartItem.price,
  );
  TestValidator.equals(
    "cart ID matches",
    retrievedItem.cart.id,
    cartItem.cart.id,
  );
  TestValidator.equals(
    "product variant ID matches",
    retrievedItem.productVariant.id,
    cartItem.productVariant.id,
  );
  TestValidator.equals(
    "SKU code matches",
    retrievedItem.productVariant.sku_code,
    cartItem.productVariant.sku_code,
  );
  TestValidator.predicate(
    "item is active (not deleted)",
    retrievedItem.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    retrievedItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    retrievedItem.updated_at.length > 0,
  );
  // Validate customer information in cart summary
  TestValidator.equals(
    "customer ID matches",
    retrievedItem.cart.customer.id,
    customerJoin.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedItem.cart.customer.email,
    customerJoin.email,
  );
  // Validate product variant price override
  TestValidator.predicate(
    "price override is number or null",
    retrievedItem.productVariant.price_override === null ||
      typeof retrievedItem.productVariant.price_override === "number",
  );
}
