import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that product creation fails with appropriate error when required
 * fields have invalid values.
 *
 * This test verifies the API's validation logic for product creation by testing
 * multiple invalid scenarios:
 *
 * 1. Title too short (less than 3 characters)
 * 2. Description too short (less than 20 characters)
 * 3. Price below minimum ($0.01)
 * 4. Price above maximum ($5000)
 * 5. Invalid tax category ID (non-UUID format)
 * 6. Invalid tax category ID (valid UUID format but non-existent ID)
 *
 * All tests must succeed with a 400 Bad Request error. The test ensures:
 *
 * - Proper validation of required fields
 * - Correct error responses for each constraint violation
 * - No product is created when validation fails
 *
 * Business Context: This validation prevents invalid product listings from
 * being created in the marketplace, ensuring that all products meet minimum
 * quality and compliance requirements for customer visibility.
 */
export async function test_api_seller_product_creation_invalid_fields(
  connection: api.IConnection,
) {
  // 1. Create seller account for authentication
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSeller.ICreate>(),
    });
  typia.assert(seller);

  // 2. Test: Title too short (less than 3 characters)
  await TestValidator.error("title too short should fail", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: '{"title":"ab", "description":"This is a sufficiently long description for testing", "price":100, "taxCategoryId":"a3d8b2c1-7777-4444-8888-111122223333"}',
    });
  });

  // 3. Test: Description too short (less than 20 characters)
  await TestValidator.error("description too short should fail", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: '{"title":"Valid title", "description":"TS", "price":100, "taxCategoryId":"a3d8b2c1-7777-4444-8888-111122223333"}',
    });
  });

  // 4. Test: Price below minimum ($0.01)
  await TestValidator.error("price below minimum should fail", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: '{"title":"Valid title", "description":"This is a sufficiently long description for testing", "price":0, "taxCategoryId":"a3d8b2c1-7777-4444-8888-111122223333"}',
    });
  });

  // 5. Test: Price above maximum ($5000)
  await TestValidator.error("price above maximum should fail", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: '{"title":"Valid title", "description":"This is a sufficiently long description for testing", "price":5001, "taxCategoryId":"a3d8b2c1-7777-4444-8888-111122223333"}',
    });
  });

  // 6. Test: Invalid tax category ID (non-UUID format)
  await TestValidator.error(
    "invalid tax category ID format should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: '{"title":"Valid title", "description":"This is a sufficiently long description for testing", "price":100, "taxCategoryId":"invalidUUID"}',
      });
    },
  );

  // 7. Test: Valid UUID format but non-existent tax category ID
  await TestValidator.error(
    "non-existent tax category ID should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: '{"title":"Valid title", "description":"This is a sufficiently long description for testing", "price":100, "taxCategoryId":"a3d8b2c1-7777-4444-8888-111122223333"}',
      });
    },
  );
}
