import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_shopping_cart_item_modify_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer signs up and logs in
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "ValidPass123!",
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Explicitly login again for session establishment
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "ValidPass123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 2: Create customer session and shopping cart
  // The session ID is not directly accessible, so we create a cart with customer ID and session ID (we assume the customer session ID equals customer.id for test simplicity due to lack of explicit session creation API)
  // The API requires shopping_mall_customer_session_id, simulate session by using customer.id
  const cart = await api.functional.shoppingMall.customer.shoppingCarts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_customer_session_id: customer.id, // Using customer.id for session simplification
      } satisfies IShoppingMallShoppingCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: Seller signs up and logs in
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "ValidPass123!",
      store_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "ValidPass123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 4: Seller creates product SKU variants for a known productCode
  const productCode = "PROD-001";

  // Create multiple SKUs
  const sku1 = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    {
      productCode,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
        price: 1000,
        attributes_json: JSON.stringify({ color: "red", size: "M" }),
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku1);

  const sku2 = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    {
      productCode,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
        price: 1200,
        attributes_json: JSON.stringify({ color: "blue", size: "L" }),
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku2);

  // Switch back to customer for cart item modifications
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "ValidPass123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 5: Modify shopping cart items - add new items
  const addItems1 =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: cart.id,
        body: {
          items: [
            { shopping_mall_product_sku_id: sku1.id, quantity: 2 },
            { shopping_mall_product_sku_id: sku2.id, quantity: 1 },
          ] satisfies IShoppingMallCartItem.ICreate[],
        } satisfies IShoppingMallShoppingCartItem.IRequest,
      },
    );
  typia.assert(addItems1);

  // Validate the additions
  TestValidator.equals(
    "Add items count should be 2",
    addItems1.pagination.records,
    2,
  );
  TestValidator.predicate(
    "Add items include sku1 with quantity 2",
    addItems1.data.some(
      (item) =>
        item.shopping_mall_product_sku_id === sku1.id && item.quantity === 2,
    ),
  );
  TestValidator.predicate(
    "Add items include sku2 with quantity 1",
    addItems1.data.some(
      (item) =>
        item.shopping_mall_product_sku_id === sku2.id && item.quantity === 1,
    ),
  );

  // Step 6: Modify shopping cart items - update quantity for sku1
  const updateItems =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: cart.id,
        body: {
          items: [
            { shopping_mall_product_sku_id: sku1.id, quantity: 5 }, // updated quantity
            { shopping_mall_product_sku_id: sku2.id, quantity: 1 },
          ] satisfies IShoppingMallCartItem.ICreate[],
        } satisfies IShoppingMallShoppingCartItem.IRequest,
      },
    );
  typia.assert(updateItems);

  TestValidator.predicate(
    "After update, sku1 quantity should be 5",
    updateItems.data.some(
      (item) =>
        item.shopping_mall_product_sku_id === sku1.id && item.quantity === 5,
    ),
  );
  TestValidator.predicate(
    "After update, sku2 quantity remains 1",
    updateItems.data.some(
      (item) =>
        item.shopping_mall_product_sku_id === sku2.id && item.quantity === 1,
    ),
  );

  // Step 7: Modify shopping cart items - remove sku2 by excluding it in patch
  const removeItems =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: cart.id,
        body: {
          items: [
            { shopping_mall_product_sku_id: sku1.id, quantity: 5 },
          ] satisfies IShoppingMallCartItem.ICreate[],
        } satisfies IShoppingMallShoppingCartItem.IRequest,
      },
    );
  typia.assert(removeItems);

  TestValidator.equals(
    "Remove sku2, only 1 item remains",
    removeItems.pagination.records,
    1,
  );
  TestValidator.predicate(
    "sku1 remains",
    removeItems.data.some(
      (item) => item.shopping_mall_product_sku_id === sku1.id,
    ),
  );
  TestValidator.predicate(
    "sku2 removed",
    !removeItems.data.some(
      (item) => item.shopping_mall_product_sku_id === sku2.id,
    ),
  );

  // Step 8: Attempt unauthorized access by logging in as another customer
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: otherCustomerEmail,
      password: "ValidPass123!",
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(otherCustomer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: otherCustomerEmail,
      password: "ValidPass123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Attempt to modify original cart's items by other customer - expect error
  await TestValidator.error(
    "other customer cannot modify someone else's cart",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.items.index(
        connection,
        {
          cartId: cart.id,
          body: {
            items: [
              { shopping_mall_product_sku_id: sku1.id, quantity: 1 },
            ] satisfies IShoppingMallCartItem.ICreate[],
          } satisfies IShoppingMallShoppingCartItem.IRequest,
        },
      );
    },
  );
}
