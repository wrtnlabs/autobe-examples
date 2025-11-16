import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";

/**
 * Test retrieving a favorite product by its unique identifier for an
 * authenticated customer.
 *
 * This scenario covers:
 *
 * 1. Customer registration (join) to create user context.
 * 2. Adding a product to the customer's favorites.
 * 3. Retrieving the favorite product entry by its ID.
 * 4. Validation of returned data correctness and authorization.
 *
 * It verifies that the favorite product API correctly stores and returns
 * favorite product data in the context of an authorized customer.
 */
export async function test_api_shopping_mall_customer_favorite_product_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Register (join) a customer to get authorized context
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@test.com",
        password: "P@ssw0rd1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a favorite product entry
  const createBody = {
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallFavoriteProduct.ICreate;

  const favorite: IShoppingMallFavoriteProduct =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(favorite);

  // 3. Retrieve the favorite product by ID
  const retrieved: IShoppingMallFavoriteProduct =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.at(
      connection,
      {
        id: favorite.id,
      },
    );
  typia.assert(retrieved);

  // 4. Validate retrieved data matches the created favorite
  TestValidator.equals(
    "retrieved favorite product ID matches",
    retrieved.id,
    favorite.id,
  );
  TestValidator.equals(
    "retrieved favorite product customer ID matches",
    retrieved.shopping_mall_customer_id,
    favorite.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "retrieved favorite product product ID matches",
    retrieved.shopping_mall_product_id,
    favorite.shopping_mall_product_id,
  );
}
