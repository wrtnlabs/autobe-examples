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

export async function test_api_customer_shopping_cart_creation(
  connection: api.IConnection,
) {
  // 1. Seller joins (registers an account)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller logs in
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      ip: null,
      href: "http://localhost/seller/login",
      referrer: "http://localhost/seller/referrer",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Seller creates a shopping mall product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
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

  // 4. Customer joins (registers an account)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "http://localhost/customer/join",
        referrer: "http://localhost/customer/referrer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer logs in
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "1234",
      ip: null,
      href: "http://localhost/customer/login",
      referrer: "http://localhost/customer/referrer",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Customer creates a new shopping cart (initially empty)
  const cartCreateBody = {} satisfies IShoppingMallShoppingCart.ICreate;

  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(shoppingCart);

  // 7. Validate that the created shopping cart belongs to the customer
  TestValidator.equals(
    "shopping cart customer_id matches logged in customer id",
    shoppingCart.customer_id,
    customer.id,
  );

  // 8. Validate that the shopping cart id is a UUID (format checked by typia.assert)
  // Validate status is a string (e.g., "active" or other business value)
  TestValidator.predicate(
    "shopping cart id is a valid UUID",
    typeof shoppingCart.id === "string" && shoppingCart.id.length > 0,
  );
  TestValidator.predicate(
    "shopping cart status is a string",
    typeof shoppingCart.status === "string",
  );
  // 9. Validate created_at and updated_at are ISO date time strings
  TestValidator.predicate(
    "shopping cart created_at is a valid date-time string",
    typeof shoppingCart.created_at === "string" &&
      !isNaN(Date.parse(shoppingCart.created_at)),
  );
  TestValidator.predicate(
    "shopping cart updated_at is a valid date-time string",
    typeof shoppingCart.updated_at === "string" &&
      !isNaN(Date.parse(shoppingCart.updated_at)),
  );
}
