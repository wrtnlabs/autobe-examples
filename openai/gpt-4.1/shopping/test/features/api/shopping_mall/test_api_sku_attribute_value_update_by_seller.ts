import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller SKU attribute value update workflow.
 *
 * This test covers:
 *
 * 1. Seller account registration and authentication
 * 2. Creating an initial SKU attribute value mapping (e.g., Color: Red)
 * 3. Updating the attribute value mapping - either changing the display name or
 *    reassigning it to another attribute
 * 4. Ensuring update is reflected in the returned record and maintains
 *    SKU+attribute uniqueness
 * 5. Validates audit fields (updated_at changes)
 * 6. Confirms update rejects duplicate (sku, attribute) pairs
 *
 * Steps:
 *
 * - Register seller
 * - Create fake SKU and attribute IDs (UUIDs)
 * - Assign initial SKU attribute value ("Color: Red")
 * - Update the mapping's display name (e.g., from "Red" to "Blue")
 * - Optionally, try reassigning to another attribute ID
 * - Validate update is successful, response is correct, audit field changed
 * - Attempt duplicate mapping and expect rejection
 */
export async function test_api_sku_attribute_value_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration/authentication
  const email = typia.random<string & tags.Format<"email">>();
  const sellerJoinInput = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://test.seller.com/join",
    referrer: "https://test.seller.com/",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(seller);

  // 2. Create a mock SKU and attribute IDs (simulate existing db entities)
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const attributeId1 = typia.random<string & tags.Format<"uuid">>(); // e.g., Color
  const attributeId2 = typia.random<string & tags.Format<"uuid">>(); // e.g., Size (for reassignment)

  // 3. Create initial attribute value mapping (Color: Red)
  const initialValue = {
    shopping_mall_product_attribute_id: attributeId1,
    value_display_name: "Red",
  } satisfies IShoppingMallProductAttributeValue.ICreate;
  const created: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      { skuId, body: initialValue },
    );
  typia.assert(created);
  TestValidator.equals(
    "created: shopping_mall_product_sku_id",
    created.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals(
    "created: shopping_mall_product_attribute_id",
    created.shopping_mall_product_attribute_id,
    attributeId1,
  );
  TestValidator.equals(
    "created: value_display_name",
    created.value_display_name,
    "Red",
  );

  // 4. Update display name (Red -> Blue)
  const updateValue1 = {
    value_display_name: "Blue",
  } satisfies IShoppingMallProductAttributeValue.IUpdate;
  const updated1: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.update(
      connection,
      {
        skuId,
        attributeValueId: created.id,
        body: updateValue1,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "updated1: value_display_name should be Blue",
    updated1.value_display_name,
    "Blue",
  );
  TestValidator.equals(
    "updated1: id should not change",
    updated1.id,
    created.id,
  );
  TestValidator.equals(
    "updated1: shopping_mall_product_attribute_id should remain the same",
    updated1.shopping_mall_product_attribute_id,
    attributeId1,
  );
  TestValidator.notEquals(
    "updated_at should change on update",
    updated1.updated_at,
    created.updated_at,
  );

  // 5. Update attribute association (reassign to another attribute) - value_display_name stays "Blue"
  const updateValue2 = {
    shopping_mall_product_attribute_id: attributeId2,
  } satisfies IShoppingMallProductAttributeValue.IUpdate;
  const updated2: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.update(
      connection,
      {
        skuId,
        attributeValueId: created.id,
        body: updateValue2,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "updated2: shopping_mall_product_attribute_id should be new attributeId2",
    updated2.shopping_mall_product_attribute_id,
    attributeId2,
  );
  TestValidator.equals(
    "updated2: value_display_name should remain Blue",
    updated2.value_display_name,
    updated1.value_display_name,
  );
  TestValidator.equals(
    "updated2: shopping_mall_product_sku_id should remain the same",
    updated2.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.notEquals(
    "updated2: updated_at should change again",
    updated2.updated_at,
    updated1.updated_at,
  );

  // 6. Attempt to create a duplicate mapping (same skuId + attributeId2, should fail unique constraint)
  await TestValidator.error(
    "duplicate (sku, attribute) pair should fail",
    async () => {
      await api.functional.shoppingMall.seller.skus.attributeValues.create(
        connection,
        {
          skuId,
          body: {
            shopping_mall_product_attribute_id: attributeId2,
            value_display_name: "Another Label",
          } satisfies IShoppingMallProductAttributeValue.ICreate,
        },
      );
    },
  );
}
