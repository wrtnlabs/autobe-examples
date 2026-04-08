import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test category deletion with subcategories and product uncategorization.
 *
 * Validates that when an administrator deletes a parent category containing subcategories, both the parent and all subcategories are soft-deleted, and all products in both the parent category and subcategories become uncategorized while remaining active and purchasable.
 *
 * This test ensures data preservation during category restructuring, verifying that products are not deleted but simply become uncategorized, and that the soft-delete mechanism preserves category records for audit purposes.
 *
 * 1. Administrator registers and authenticates to gain category management permissions.
 * 2. Administrator creates a parent category with name and description.
 * 3. Administrator creates a subcategory under the parent category using parent_category_id.
 * 4. Seller registers and authenticates to gain product creation permissions.
 * 5. Seller creates a product assigned to the parent category.
 * 6. Seller creates another product assigned to the subcategory.
 * 7. Administrator deletes the parent category using the erase endpoint.
 * 8. Validates that the parent category deletion succeeds with void response.
 * 9. Validates that the parent category is soft-deleted (deleted_at is not null).
 * 10. Validates that the subcategory is also soft-deleted (deleted_at is not null).
 * 11. Validates that both products still exist and are not deleted (deleted_at is null).
 * 12. Validates that both products' category field is now null (uncategorized).
 * 13. Validates that both products remain visible and purchasable (not soft-deleted).
 */
export async function test_api_category_deletion_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create parent category
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under parent
  const subCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          parent_category_id: parentCategory.id,
        },
      },
    );
  typia.assert(subCategory);
  // 4. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 5. Create product in parent category
  const productInParent =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: parentCategory.id,
        },
      },
    );
  typia.assert(productInParent);
  // 6. Create product in subcategory
  const productInSub =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: subCategory.id,
        },
      },
    );
  typia.assert(productInSub);
  // 7. Delete parent category (should cascade delete subcategory)
  await api.functional.shoppingMall.administrator.admins.categories.erase(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // 8. Verify parent category is soft-deleted
  TestValidator.predicate(
    "parent category should be soft-deleted",
    parentCategory.deleted_at !== null,
  );
  // 9. Verify subcategory is also soft-deleted
  TestValidator.predicate(
    "subcategory should be soft-deleted",
    subCategory.deleted_at !== null,
  );
  // 10. Verify product in parent category still exists and is uncategorized
  TestValidator.predicate(
    "product in parent category should not be deleted",
    productInParent.deleted_at === null,
  );
  TestValidator.equals(
    "product in parent category should be uncategorized",
    productInParent.category,
    null,
  );
  // 11. Verify product in subcategory still exists and is uncategorized
  TestValidator.predicate(
    "product in subcategory should not be deleted",
    productInSub.deleted_at === null,
  );
  TestValidator.equals(
    "product in subcategory should be uncategorized",
    productInSub.category,
    null,
  );
}
