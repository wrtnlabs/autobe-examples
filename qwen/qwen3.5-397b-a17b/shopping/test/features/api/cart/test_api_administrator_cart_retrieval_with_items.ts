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
 * Test that an administrator can successfully retrieve a customer's shopping cart with all cart items.
 *
 * **Setup:**
 * 1. Authenticate as administrator via join
 * 2. Create a customer account via join
 * 3. Add multiple product variants to the customer's cart with different quantities
 *
 * **Test Execution:**
 * 1. Administrator calls GET /shoppingMall/administrator/carts/{cartId} with the customer's cart ID
 * 2. Verify response contains complete cart entity with customer information
 * 3. Verify all active cart items are returned with correct quantities and price snapshots
 * 4. Verify each cart item includes product variant details (SKU code, price override, parent product)
 * 5. Verify cart metadata (created_at, updated_at) is present
 * 6. Verify soft-deleted items are excluded from the items array
 *
 * **Business Logic Validation:**
 * - Administrator has platform oversight access to all customer carts
 * - Cart items are properly joined with product variant information
 * - Price snapshots are preserved from when items were added to cart
 * - Soft-deleted items are filtered out from the response
 */
export async function test_api_administrator_cart_retrieval_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Customer setup - join and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Add multiple items to customer's cart
  const cartItemCount = 3;
  const cartItems: IShoppingMallCartItem[] = [];
  for (let i = 0; i < cartItemCount; i++) {
    const cartItem =
      await generate_random_shopping_mall_customer_cart_items_create(
        customerLoginConnection,
        {
          body: {
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
          },
        },
      );
    typia.assert(cartItem);
    cartItems.push(cartItem);
  }
  // 4. Administrator retrieves the customer's cart
  const cartId = cartItems[0].cart.id;
  const cart = await api.functional.shoppingMall.administrator.carts.at(
    adminLoginConnection,
    {
      cartId: cartId,
    },
  );
  typia.assert(cart);
  // 5. Validate cart structure and content
  TestValidator.equals("cart ID matches", cart.id, cartId);
  TestValidator.equals(
    "customer ID matches",
    cart.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    cart.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate("cart has items", cart.items.length > 0);
  TestValidator.predicate(
    "all items are active (not soft-deleted)",
    cart.items.every((item) => item.deleted_at === null),
  );
  // 6. Validate each cart item has required product variant information
  for (const item of cart.items) {
    TestValidator.predicate(
      "item has product variant",
      item.productVariant !== null,
    );
    TestValidator.predicate(
      "product variant has SKU code",
      item.productVariant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "product variant has parent product",
      item.productVariant.product !== null,
    );
    TestValidator.equals("item cart ID matches", item.cart.id, cartId);
    TestValidator.predicate("item price is positive", item.price > 0);
  }
  // 7. Validate cart metadata
  TestValidator.predicate("cart has created_at", cart.created_at.length > 0);
  TestValidator.predicate("cart has updated_at", cart.updated_at.length > 0);
  // 8. Verify price snapshots and quantities are preserved
  for (const originalItem of cartItems) {
    const retrievedItem = cart.items.find(
      (item) => item.id === originalItem.id,
    );
    if (retrievedItem) {
      TestValidator.equals(
        "price snapshot preserved",
        retrievedItem.price,
        originalItem.price,
      );
      TestValidator.equals(
        "quantity matches",
        retrievedItem.quantity,
        originalItem.quantity,
      );
    }
  }
}
