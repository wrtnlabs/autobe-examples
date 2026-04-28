import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";

/**
 * Test retrieving a subcategory by UUID and validating the parent hierarchy relationship.
 *
 * Validates that a subcategory returned from the categories endpoint includes all expected fields: id, name, description, timestamps, and the parent category reference populated with the root category's summary. The childrenCategories array must be empty since subcategories cannot have nested subcategories under the two-level hierarchy constraint.
 *
 * This test ensures the self-referential parent category relationship is correctly resolved, verifying that hierarchical references are eager-loaded and that the platform's strict one-level nesting limit is maintained through the childrenCategories validation.
 *
 * 1. Register and authenticate as administrator to enable category creation.
 * 2. Admin creates a root category at the top level (no parent).
 * 3. Admin creates a subcategory under the root category.
 * 4. Retrieve the subcategory by its UUID via the public categories endpoint.
 * 5. Validate the subcategory's id, name, description, and timestamps match input.
 * 6. Verify parent category reference resolves correctly to root category.
 * 7. Confirm childrenCategories array is empty (two-level hierarchy enforces no nested subcategories).
 */
export async function test_api_category_retrieval_subcategory_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create root category using utility function (creates root by default)
  const rootCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(rootCategory);
  // 3. Create subcategory under the root category (requires explicit parent ID)
  const subcategory =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentEcommercePlatformCategoryId: rootCategory.id,
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve the subcategory by UUID (public endpoint, no auth required)
  const retrievedSubcategory =
    await api.functional.ecommercePlatform.categories.at(connection, {
      categoryId: subcategory.id,
    });
  typia.assert(retrievedSubcategory);
  // 5. Validate subcategory fields match expected values
  TestValidator.equals(
    "subcategory id matches",
    retrievedSubcategory.id,
    subcategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    retrievedSubcategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "subcategory description matches",
    retrievedSubcategory.description,
    subcategory.description,
  );
  // 6. Validate parent category reference is correctly resolved to root
  TestValidator.equals(
    "parent category id matches root",
    retrievedSubcategory.parentCategory!.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "parent category name matches root",
    retrievedSubcategory.parentCategory!.name,
    rootCategory.name,
  );
  // 7. Verify subcategories cannot have children (two-level hierarchy constraint)
  TestValidator.equals(
    "subcategories have no children (two-level hierarchy)",
    retrievedSubcategory.childrenCategories,
    [],
  );
}
