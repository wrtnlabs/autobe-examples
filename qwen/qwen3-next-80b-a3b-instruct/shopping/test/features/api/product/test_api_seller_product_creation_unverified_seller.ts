import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_product_creation_unverified_seller(
  connection: api.IConnection,
) {
  const sellerData = typia.random<IShoppingMallSeller.ICreate>();

  // Step 1: Create unverified seller account
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Verify seller status is 'pending_verification'
  TestValidator.equals(
    "seller status should be pending_verification",
    seller.status,
    "pending_verification",
  );

  // Step 3: Attempt to create product as unverified seller - should fail with 403 Forbidden
  await TestValidator.error(
    "unverified seller should be forbidden from creating products",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: typia.random<IShoppingMallProduct.ICreate>(),
      });
    },
  );
}
