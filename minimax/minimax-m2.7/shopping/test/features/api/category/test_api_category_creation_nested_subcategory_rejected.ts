import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that creating a subcategory under another subcategory (2 levels deep) is rejected.
 *
 * Validates the business rule that categories support only one level of nesting. This test creates a top-level category 'Home & Garden', then creates a first-level subcategory 'Furniture' under it, and finally attempts to create a second-level subcategory 'Chairs' under 'Furniture'. The API should reject the second request with an appropriate client error (400 or 422) indicating that the parent category must be a top-level category.
 *
 * **Business Rule Validation:**
 * - Categories support only one level of parent-child nesting
 * - Subcategories cannot have children (only top-level categories can be parents)
 * - When attempting to create a subcategory under another subcategory, the API must reject with appropriate error
 *
 * 1. Authenticate as superAdmin to access category management endpoints.
 * 2. Create a top-level category 'Home & Garden' without parent_id.
 * 3. Create a first-level subcategory 'Furniture' with parent_id pointing to 'Home & Garden'.
 * 4. Attempt to create a second-level subcategory 'Chairs' with parent_id pointing to 'Furniture'.
 * 5. Verify the request fails with HTTP 400 or 422 status.
 * 6. Validate error message indicates parent category must be a top-level category.
 */
export async function test_api_category_creation_nested_subcategory_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a top-level category 'Home & Garden'
  const homeGardenCategory =
    await generate_random_ecommerce_mall_super_admin_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Home & Garden",
          description: "Home and garden products",
        },
      },
    );
  typia.assert(homeGardenCategory);
  // 3. Create a first-level subcategory 'Furniture' under 'Home & Garden'
  const furnitureCategory =
    await generate_random_ecommerce_mall_super_admin_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Furniture",
          description: "Furniture for home and garden",
          parent_id: homeGardenCategory.id,
        },
      },
    );
  typia.assert(furnitureCategory);
  // 4. Attempt to create a second-level subcategory 'Chairs' under 'Furniture' - should fail
  await TestValidator.error(
    "creating subcategory under another subcategory should be rejected",
    async () => {
      await generate_random_ecommerce_mall_super_admin_admin_categories_create(
        superAdminConnection,
        {
          body: {
            name: "Chairs",
            description: "Chairs and seating",
            parent_id: furnitureCategory.id,
          },
        },
      );
    },
  );
}
