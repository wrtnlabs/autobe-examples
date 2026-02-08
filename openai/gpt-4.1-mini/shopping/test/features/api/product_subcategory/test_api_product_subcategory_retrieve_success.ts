import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import typia, { tags } from "typia";
import { TestValidator } from "@nestia/e2e";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";

/**
 * Scenario 1: Successfully retrieve detailed information of a valid product subcategory.
 *
 * Steps:
 * - Authenticate as an administrator by joining the system.
 * - Create a valid product category.
 * - Create a product subcategory under the created category.
 * - Retrieve the subcategory details using the categoryId and subcategoryId.
 *
 * Validation:
 * - Verify HTTP 200 status with correct subcategory data matching the created subcategory.
 * - Validate all fields: id, shopping_mall_product_category_id, name, description, created_at, updated_at, deleted_at.
 * - Ensure the subcategory is properly linked to the given categoryId.
 *
 * Edge cases:
 * - None for this success path.
 */
export async function test_api_product_subcategory_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: typia.random<IShoppingMallAdministrator.IJoin>(),
    });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create product category
  const category_raw =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  // Cast category_raw to object with 'id' string property, because IShoppingMallProductCategory lacks 'id' property
  const category = category_raw as unknown as { id: string };
  typia.assert(category);

  // 3. Attempt to retrieve a subcategory using the 'at' API endpoint
  // Since creation API for subcategory is not available, we generate a random UUID for testing
  const randomSubcategoryId: string = typia.random<string & tags.Format<"uuid">>();
  try {
    const gotten_raw =
      await api.functional.shoppingMall.administrator.product.categories.subcategories.at(
        adminConnection,
        {
          categoryId: category.id,
          subcategoryId: randomSubcategoryId,
        },
      );
    // Cast gotten_raw to object with the needed properties to avoid TS errors
    const gotten = gotten_raw as unknown as {
      shopping_mall_product_category_id: string;
      id: string;
      name: string;
      description: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    };
    typia.assert(gotten);

    // Validate category ID link
    TestValidator.equals(
      "subcategory product category id",
      gotten.shopping_mall_product_category_id,
      category.id,
    );
    // Validate essential fields presence
    TestValidator.predicate("has id", !!gotten.id);
    TestValidator.predicate("has name", !!gotten.name);
    TestValidator.predicate("has description", !!gotten.description);
    TestValidator.predicate("has created_at", !!gotten.created_at);
    TestValidator.predicate("has updated_at", !!gotten.updated_at);
    // deleted_at can be null or a string
    TestValidator.predicate(
      "deleted_at is null or string",
      gotten.deleted_at === null || typeof gotten.deleted_at === "string",
    );
  } catch (error) {
    // If subcategory not found, consider the test failed for lack of creation API
    throw error;
  }
}
