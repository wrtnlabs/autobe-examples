import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";

/**
 * Validate the process of updating an existing SKU attribute value by an
 * authenticated seller.
 *
 * Business Scenario:
 *
 * 1. A new seller registers and authenticates via the join endpoint.
 * 2. The authenticated seller creates a new SKU attribute value with valid,
 *    realistic data.
 * 3. The seller updates the SKU attribute value's 'code' and optionally 'value'
 *    and 'description'.
 * 4. The test validates that the updates are successful, the response data matches
 *    exactly, and no authorization or integrity violations occur.
 *
 * This test ensures end-to-end coverage of seller authentication, SKU attribute
 * value creation, update operations, and response validation. It verifies data
 * integrity and proper API contract adherence.
 *
 * @param connection API connection context
 */
export async function test_api_shoppingmall_sku_attribute_value_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "StrongPass123!",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create SKU attribute value
  // Generate realistic shopping_mall_sku_attribute_id as UUID string
  const skuAttributeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create body for SKU attribute value creation
  const createBody = {
    shopping_mall_sku_attribute_id: skuAttributeId,
    value: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    code: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const createdSkuAttributeValue: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.shoppingMallSkuAttributeValues.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdSkuAttributeValue);

  // 3. Update the created SKU attribute value
  // Prepare new update data, must include 'code' per IUpdate
  const updateBody = {
    code: RandomGenerator.alphaNumeric(10), // Different code
    value: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IShoppingMallSkuAttributeValue.IUpdate;

  const updatedSkuAttributeValue: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.shoppingMallSkuAttributeValues.update(
      connection,
      {
        id: createdSkuAttributeValue.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSkuAttributeValue);

  // 4. Validate updated fields
  TestValidator.equals(
    "SKU attribute value ID remains the same",
    updatedSkuAttributeValue.id,
    createdSkuAttributeValue.id,
  );
  TestValidator.equals(
    "SKU attribute updated code equals request",
    updatedSkuAttributeValue.code,
    updateBody.code,
  );

  // The 'value' property is optional in update, if defined must match
  if (updateBody.value !== undefined) {
    TestValidator.equals(
      "SKU attribute updated value equals request",
      updatedSkuAttributeValue.value,
      updateBody.value,
    );
  }

  // The 'description' property accepts null or string
  if (updateBody.description !== undefined) {
    TestValidator.equals(
      "SKU attribute updated description equals request",
      updatedSkuAttributeValue.description,
      updateBody.description,
    );
  }
}
