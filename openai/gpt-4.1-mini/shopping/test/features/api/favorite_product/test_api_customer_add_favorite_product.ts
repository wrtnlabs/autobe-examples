import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";

export async function test_api_customer_add_favorite_product(
  connection: api.IConnection,
) {
  // 1. Register a new customer and authenticate
  const customerInput = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customer);

  // 2. Add a product to customer's favorites
  // Use a random valid product UUID
  const favoriteCreateBody = {
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallFavoriteProduct.ICreate;

  const favoriteProduct: IShoppingMallFavoriteProduct =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.create(
      connection,
      {
        body: favoriteCreateBody,
      },
    );
  typia.assert(favoriteProduct);

  // 3. Validate customer ID matches
  TestValidator.equals(
    "Customer ID matches",
    favoriteProduct.shopping_mall_customer_id,
    customer.id,
  );
  // 4. Validate product ID matches
  TestValidator.equals(
    "Product ID matches",
    favoriteProduct.shopping_mall_product_id,
    favoriteCreateBody.shopping_mall_product_id,
  );

  // 5. Validate created_at and updated_at are valid ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO string",
    typeof favoriteProduct.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
        favoriteProduct.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof favoriteProduct.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
        favoriteProduct.updated_at,
      ),
  );
}
