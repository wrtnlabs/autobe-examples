import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";

/**
 * Test the creation of a favorite product entry by an authenticated customer.
 * The test starts with the customer joining the service as a new user,
 * receiving authorization tokens. Using the authentication token, the customer
 * posts a request to create a favorite product by specifying a valid product
 * ID. The response should confirm successful creation and correct linkage
 * between the customer and the product in the favorites list. The scenario
 * validates correct role-based authentication, data association, and response
 * integrity.
 */
export async function test_api_customer_favorite_product_creation(
  connection: api.IConnection,
) {
  // 1. Customer joins the service as a new user
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    full_name: RandomGenerator.name(),
    href: "https://test.local/signup",
    referrer: "https://test.local/",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Generate a product ID to use as favorite
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create a favorite product entry for the authenticated customer
  const favoriteProduct: IShoppingMallFavoriteProduct =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.create(
      connection,
      {
        body: {
          shopping_mall_product_id: productId,
        } satisfies IShoppingMallFavoriteProduct.ICreate,
      },
    );
  typia.assert(favoriteProduct);

  // 4. Validate linkage and response integrity
  TestValidator.equals(
    "customer ID matches",
    favoriteProduct.shopping_mall_customer_id,
    customer.id,
  );

  TestValidator.equals(
    "product ID matches",
    favoriteProduct.shopping_mall_product_id,
    productId,
  );
}
