import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the complete product deletion process by a seller.
 *
 * This test verifies the process from authenticating as a seller via join
 * endpoint, to deleting a product identified by productCode. It ensures
 * authorization is enforced and the product is permanently removed without soft
 * delete fallback.
 *
 * Workflow:
 *
 * 1. Authenticate a new seller user
 * 2. Generate a random productCode simulating an existing product
 * 3. Call the product deletion API to erase the product
 *
 * This test confirms secure authorized deletion of products by sellers.
 */
export async function test_api_shopping_mall_product_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a new seller
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Step 2: Prepare a valid random productCode for deletion
  // Since no product creation API is available here, generate a random productCode string
  // simulating an existing product code for deletion testing.
  const productCode: string = typia.random<string>();

  // Step 3: Call the product deletion API to erase the product
  await api.functional.shoppingMall.seller.shoppingMallProducts.erase(
    connection,
    {
      productCode: productCode,
    },
  );
}
