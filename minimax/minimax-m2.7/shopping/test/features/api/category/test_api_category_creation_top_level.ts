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
 * Test creating a top-level category as a super administrator.
 *
 * Validates the category creation flow for super administrators. Tests that
 * a top-level category can be created with a name and description, verifying
 * that the response contains all expected fields including auto-generated UUID,
 * null parent reference, correct timestamps, and empty subcategories.
 *
 * **Test Flow:**
 * 1. Authenticate as superAdmin using the join endpoint
 * 2. Create a new top-level category with name 'Electronics' and description
 * 3. Validate the response contains all expected fields
 * 4. Verify parent is null, subcategories_count is 0, and subcategories array is empty
 *
 * 1. Administrator registers with email and password.
 * 2. Administrator creates a top-level category with name and description.
 * 3. System validates and stores the category.
 * 4. Response returns the created category with all fields.
 */
export async function test_api_category_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a top-level category
  const category: IEcommerceMallCategory =
    await api.functional.ecommerceMall.superAdmin.admin.categories.create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Validate category fields
  TestValidator.equals("id is a valid UUID", category.id.length, 36);
  TestValidator.equals("name matches input", category.name, "Electronics");
  TestValidator.equals(
    "description matches input",
    category.description,
    "Electronic devices and accessories",
  );
  // 4. Validate parent is null (top-level category)
  TestValidator.equals("parent is null for top-level", category.parent, null);
  // 5. Validate timestamps exist
  TestValidator.predicate(
    "created_at is a valid date-time",
    !isNaN(Date.parse(category.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid date-time",
    !isNaN(Date.parse(category.updated_at)),
  );
  // 6. Validate deleted_at is null
  TestValidator.equals("deleted_at is null", category.deleted_at, null);
  // 7. Validate subcategories are empty (top-level category)
  TestValidator.equals(
    "subcategories_count is 0",
    category.subcategories_count,
    0,
  );
  TestValidator.equals(
    "subcategories array is empty",
    category.subcategories.length,
    0,
  );
}
