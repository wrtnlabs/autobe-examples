import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_creation_unauthenticated(
  connection: api.IConnection,
) {
  // Attempt to create a product without authentication
  // The operation should fail with 401 Unauthorized

  // Use a minimal valid IShoppingMallProduct.ICreate value
  // Since IShoppingMallProduct.ICreate is defined as string, we must provide a valid string representation
  // Based on the schema, this is a string type with no specific format constraints

  await TestValidator.error(
    "unauthenticated user should not be able to create product",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: "" satisfies IShoppingMallProduct.ICreate,
      });
    },
  );
}
