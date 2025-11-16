import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSelectedOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSelectedOptions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

export async function test_api_customer_shopping_cart_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create seller account and login
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Seller login for authentication context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreateBody.email,
      password: sellerCreateBody.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Seller creates a new product
  const productCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 4. Create customer account and login
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://referrer.example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerCreateBody.email,
      password: customerCreateBody.password,
      ip: null,
      href: "https://customer.example.com/login",
      referrer: "https://referrer.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Customer creates a shopping cart including items with the seller's product
  // Note: product_id must be UUID but product.code is string, so use a random UUID for product_id to satisfy type
  const cartItemBody = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    selected_options: undefined,
  } satisfies IShoppingMallCartItem.ICreate;
  const shoppingCartCreateBody = {
    items: [cartItemBody],
  } satisfies IShoppingMallShoppingCart.ICreate;
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(shoppingCart);

  // 6. Retrieve shopping cart by ID as the authenticated customer
  const retrievedCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.at(connection, {
      shoppingCartId: shoppingCart.id,
    });
  typia.assert(retrievedCart);

  TestValidator.equals(
    "shopping cart IDs match",
    retrievedCart.id,
    shoppingCart.id,
  );
  TestValidator.equals(
    "shopping cart customer ID matches",
    retrievedCart.customer_id,
    customer.id,
  );

  // 7. Negative test: Try to retrieve the shopping cart as an unauthorized user
  // Create and login a second customer
  const otherCustomerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://other.customer.example.com/join",
    referrer: "https://referrer.example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerCreateBody,
    });
  typia.assert(otherCustomer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: otherCustomerCreateBody.email,
      password: otherCustomerCreateBody.password,
      ip: null,
      href: "https://other.customer.example.com/login",
      referrer: "https://referrer.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  await TestValidator.error(
    "unauthorized user cannot retrieve shopping cart",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.at(connection, {
        shoppingCartId: shoppingCart.id,
      });
    },
  );

  // 8. Negative test: Try to retrieve a non-existent shopping cart
  await TestValidator.error(
    "retrieving non-existent shopping cart fails",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.at(connection, {
        shoppingCartId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
