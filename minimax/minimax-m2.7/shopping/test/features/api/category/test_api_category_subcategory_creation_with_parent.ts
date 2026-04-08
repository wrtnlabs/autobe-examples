import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test creating a subcategory under an existing top-level parent category.
 *
 * Validates the subcategory creation workflow by:
 * 1. Authenticating as an administrator to access admin endpoints
 * 2. Retrieving existing top-level categories to use as parent
 * 3. Creating a subcategory with the parent_id reference
 * 4. Verifying the response contains correct parent reference and data
 *
 * This ensures the one-level deep hierarchy rule is enforced - subcategories
 * can be created under parent categories, and the parent reference is
 * correctly maintained in the response.
 *
 * 1. Administrator authenticates via POST /auth/admin/join.
 * 2. System retrieves top-level categories via PATCH /ecommerceMall/categories.
 * 3. Administrator creates subcategory via POST /ecommerceMall/admin/admin/categories
 *    with name 'Smartphones' and parent_id referencing the selected parent.
 * 4. Response is validated for correct parent reference and data structure.
 * 5. Subcategory data is verified including parent object contains id and name.
 */
export async function test_api_category_subcategory_creation_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get existing top-level categories (parents only)
  const parentCategoriesResponse =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        onlyParents: true,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(parentCategoriesResponse);
  // Ensure at least one parent category exists
  TestValidator.predicate(
    "at least one parent category exists",
    parentCategoriesResponse.data.length > 0,
  );
  // Pick the first parent category
  const parentCategory = parentCategoriesResponse.data[0];
  // 3. Create a subcategory under the parent
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Validate response
  TestValidator.equals(
    "subcategory name is Smartphones",
    subcategory.name,
    "Smartphones",
  );
  // 5. Verify parent reference
  TestValidator.predicate("parent is not null", subcategory.parent !== null);
  if (subcategory.parent !== null) {
    TestValidator.equals(
      "parent id matches",
      subcategory.parent.id,
      parentCategory.id,
    );
    TestValidator.equals(
      "parent name matches",
      subcategory.parent.name,
      parentCategory.name,
    );
  }
}
