import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";

export async function test_api_customer_delete_favorite_product(
  connection: api.IConnection,
) {
  // 1. Register new customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a favorite product for the authenticated customer
  const favoriteProduct: IShoppingMallFavoriteProduct =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.create(
      connection,
      {
        body: {
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallFavoriteProduct.ICreate,
      },
    );
  typia.assert(favoriteProduct);

  // Validate created favoriteProduct ownership
  TestValidator.equals(
    "favorite product owner matches authenticated customer",
    favoriteProduct.shopping_mall_customer_id,
    customer.id,
  );

  // 3. Delete the favorite product
  await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.erase(
    connection,
    {
      id: favoriteProduct.id,
    },
  );

  // Additional validation could be done by attempting to access or re-delete the favorite product, but not required here
}
