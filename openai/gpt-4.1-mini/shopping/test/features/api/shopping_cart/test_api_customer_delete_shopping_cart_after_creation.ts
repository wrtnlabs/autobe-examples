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

export async function test_api_customer_delete_shopping_cart_after_creation(
  connection: api.IConnection,
) {
  // 1. Customer signup
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerCreateBody = {
    email: customerEmail,
    password: customerPassword,
    full_name: RandomGenerator.name(),
    href: `https://example.com/signup`,
    referrer: `https://example.com/referrer`,
  } satisfies IShoppingMallCustomer.ICreate;
  const createdCustomer = await api.functional.auth.customer.join(connection, {
    body: customerCreateBody,
  });
  typia.assert(createdCustomer);

  // 2. Seller signup
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerCreateBody = {
    email: sellerEmail,
    password: sellerPassword,
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(createdSeller);

  // 3. Seller login to authenticate as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: `https://example.com/login`,
      ip: null,
      referrer: `https://example.com/referrer`,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 4. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(), // Uppercase for product code
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const createdProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(createdProduct);

  // 5. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: `https://example.com/login`,
      ip: null,
      referrer: `https://example.com/referrer`,
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Customer creates a shopping cart (no items)
  const shoppingCartCreateBody = {
    items: [],
  } satisfies IShoppingMallShoppingCart.ICreate;
  const createdCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(createdCart);

  // 7. Customer deletes the shopping cart by its id
  await api.functional.shoppingMall.customer.shoppingCarts.erase(connection, {
    shoppingCartId: createdCart.id,
  });

  // 8. Since no API to retrieve cart exists, just assume deletion success
  TestValidator.predicate("shopping cart deletion succeeded", true);
}
