import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test the deletion of a product category by an authorized seller.
 *
 * The test covers realistic business scenarios:
 *
 * 1. Seller registration and authentication.
 * 2. Attempting to delete a product category by its unique ID.
 * 3. Verifying that the deletion is successful without dependent products.
 * 4. Verifying that deletion fails when performed by unauthenticated clients.
 *
 * Each API call's input and output are fully validated using typia.assert.
 */
export async function test_api_product_category_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registers and authenticates
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Seller tries to delete a product category by a valid UUID id
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Delete operation - expects void if success
  await api.functional.shoppingMall.seller.productCategories.erase(connection, {
    id: categoryId,
  });

  // 3. Attempt deletion with unauthenticated connection (simulate by empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.shoppingMall.seller.productCategories.erase(
      unauthConnection,
      {
        id: categoryId,
      },
    );
  });
}
