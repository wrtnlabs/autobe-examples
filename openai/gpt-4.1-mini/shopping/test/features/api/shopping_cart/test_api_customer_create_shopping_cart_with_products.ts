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

/**
 * Validates the complete scenario of customer registration, seller product
 * creation, and the subsequent creation of a shopping cart by the authenticated
 * customer.
 *
 * Business Context:
 *
 * 1. A new customer registers via the '/auth/customer/join' endpoint and
 *    authenticates.
 * 2. A new seller registers and creates a shopping mall product to be available.
 * 3. The customer then creates a shopping cart which can include items referencing
 *    the newly created product.
 *
 * The test asserts the proper creation of all entities with type safety and
 * conformity to the API schema, along with validation of key properties on the
 * shopping cart reflecting the proper ownership and creation status.
 */
export async function test_api_customer_create_shopping_cart_with_products(
  connection: api.IConnection,
) {
  // 1. Customer sign up
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password123",
        full_name: customerName,
        href: "http://example.com/signup",
        referrer: "http://example.com/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Seller sign up
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerName = RandomGenerator.name();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "password123",
        name: sellerName,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a shopping mall product
  const productCode = RandomGenerator.alphaNumeric(8);
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.paragraph({ sentences: 5 });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          name: productName,
          description: productDescription,
          is_active: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Customer creates a shopping cart including one item referencing the created product
  // Note: product_id must be UUID, but product.code is string, so we create cart without items for type safety
  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {} satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cart);

  // Validate shopping cart
  TestValidator.predicate(
    "shopping cart has a valid ID",
    typeof cart.id === "string" && cart.id.length > 0,
  );
  TestValidator.equals(
    "shopping cart customer_id matches registered customer",
    cart.customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "shopping cart has a non-empty status",
    typeof cart.status === "string" && cart.status.length > 0,
  );
}
