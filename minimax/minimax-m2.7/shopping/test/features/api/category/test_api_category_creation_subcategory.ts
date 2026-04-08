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
 * Test creating a subcategory under an existing top-level category.
 *
 * Validates the complete subcategory creation flow including superAdmin authentication,
 * parent category creation, and subcategory assignment. Ensures that the subcategory
 * correctly references its parent category through the nested parent property.
 *
 * 1. SuperAdmin authenticates via join endpoint to obtain access token.
 * 2. Creates a top-level parent category 'Clothing' with description.
 * 3. Creates a subcategory 'Men' under the parent.
 * 4. Validates subcategory's parent property is populated with correct parent info.
 * 5. Validates parent's subcategories_count equals 1.
 */
export async function test_api_category_creation_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create parent top-level category 'Clothing'
  const parentBody = {
    name: "Clothing",
    description: "Apparel and fashion items",
  } satisfies IEcommerceMallCategory.ICreate;
  const parentCategory =
    await api.functional.ecommerceMall.superAdmin.admin.categories.create(
      superAdminConnection,
      {
        body: parentBody,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory 'Men' under the parent (ICreate only has name and description)
  const subcategoryBody = {
    name: "Men",
    description: "Men's clothing section",
  } satisfies IEcommerceMallCategory.ICreate;
  const subcategory =
    await api.functional.ecommerceMall.superAdmin.admin.categories.create(
      superAdminConnection,
      {
        body: subcategoryBody,
      },
    );
  typia.assert(subcategory);
  // 4. Validate subcategory's parent property contains correct parent info
  TestValidator.notEquals("parent property exists", subcategory.parent, null);
  TestValidator.equals(
    "parent id matches",
    subcategory.parent!.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    subcategory.parent!.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent description matches",
    subcategory.parent!.description,
    parentCategory.description,
  );
  // 5. Validate subcategory follows one-level nesting rule (no sub-subcategories)
  TestValidator.equals(
    "subcategory subcategories_count is 0",
    subcategory.subcategories_count,
    0,
  );
  TestValidator.equals(
    "subcategory subcategories array is empty",
    subcategory.subcategories.length,
    0,
  );
  // 6. Validate parent has subcategories_count of 1 reflecting the new subcategory
  TestValidator.equals(
    "parent has one subcategory",
    parentCategory.subcategories_count,
    1,
  );
  TestValidator.predicate(
    "parent has subcategories array",
    parentCategory.subcategories.length > 0,
  );
}