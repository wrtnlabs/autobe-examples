import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate SKU attribute value deletion workflow by a seller.
 *
 * This test covers authenticating as a new seller, assigning a product
 * attribute value to a SKU, and then deleting that mapping—confirming that
 * variant management, uniqueness, and deletion rules work as designed and that
 * record removal is effective.
 *
 * 1. Register a new seller (join): use typia.random for all required data of
 *    IShoppingMallSeller.ICreate.
 * 2. Simulate that this seller is managing a SKU (randomly generate a SKU ID:
 *    string & tags.Format<"uuid">).
 * 3. Generate a new attribute for the SKU—randomly pick an attribute ID (string &
 *    tags.Format<"uuid">) and value_display_name (RandomGenerator.paragraph({
 *    sentences: 2 })).
 * 4. Assign the attribute value to the SKU using skuId and attribute value create
 *    request.
 * 5. Immediately delete the assigned attribute value from the SKU using the erase
 *    API.
 * 6. Validate that the deletion result returns the correct record (PK, foreign
 *    keys, value, timestamps dealt by the API), and all properties pass
 *    typia.assert.
 * 7. Ensure uniqueness and audit rules by reassigning the same attribute value
 *    (expect allowed, as deletion should release the constraint) and deleting
 *    again.
 */
export async function test_api_sku_attribute_value_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 2. Simulate managing a SKU
  const skuId = typia.random<string & tags.Format<"uuid">>();

  // 3. Generate attribute info
  const attributeId = typia.random<string & tags.Format<"uuid">>();
  const valueDisplayName = RandomGenerator.paragraph({ sentences: 2 });

  // 4. Assign the attribute value to this SKU
  const assignedAttribute =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId,
        body: {
          shopping_mall_product_attribute_id: attributeId,
          value_display_name: valueDisplayName,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(assignedAttribute);

  // 5. Delete the assigned attribute value
  const deleted =
    await api.functional.shoppingMall.seller.skus.attributeValues.erase(
      connection,
      {
        skuId,
        attributeValueId: assignedAttribute.id,
      },
    );
  typia.assert(deleted);
  TestValidator.equals(
    "deleted attribute value mapping matches created",
    deleted,
    assignedAttribute,
  );

  // 6. Ensure deletion releases uniqueness constraints by reassigning same value
  const reassigned =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId,
        body: {
          shopping_mall_product_attribute_id: attributeId,
          value_display_name: valueDisplayName,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(reassigned);

  // 7. Delete again
  const deletedAgain =
    await api.functional.shoppingMall.seller.skus.attributeValues.erase(
      connection,
      {
        skuId,
        attributeValueId: reassigned.id,
      },
    );
  typia.assert(deletedAgain);
  TestValidator.equals(
    "deleted after reassignment matches reassigned",
    deletedAgain,
    reassigned,
  );
}
