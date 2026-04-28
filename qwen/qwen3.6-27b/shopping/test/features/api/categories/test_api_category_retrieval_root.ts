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
 * Test retrieving a root category by its UUID identifier.
 *
 * Validates the complete root category retrieval flow: admin authentication, root
 * category creation, and detailed category lookup. Ensures that the retrieved
 * category contains all expected fields with correct values for a top-level
 * category in the platform's two-level hierarchy structure.
 *
 * Root categories have no parent (parentCategory is null) and may contain child
 * subcategories. This test verifies that a newly created root category without
 * any subcategories returns an empty childrenCategories array and has deleted_at
 * set to null indicating active status.
 *
 * 1. Administrator registers with email and password credentials.
 * 2. Administrator creates a root category with name and description (no parent).
 * 3. Retrieve the root category by its UUID using the public categories endpoint.
 * 4. Validate the category response contains correct id, name, description.
 * 5. Verify root-specific fields: parentCategory is null, childrenCategories is empty, deleted_at is null.
 */
export async function test_api_category_retrieval_root(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Administrator creates a root category (no parent)
  const rootCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(rootCategory);
  // 3. Retrieve the root category by ID (public endpoint, no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedCategory =
    await api.functional.ecommercePlatform.categories.at(publicConnection, {
      categoryId: rootCategory.id,
    });
  typia.assert(retrievedCategory);
  // 4. Validate category fields match the created category
  TestValidator.equals(
    "category id matches",
    retrievedCategory.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    rootCategory.name,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    rootCategory.description,
  );
  // 5. Validate root category specific attributes
  TestValidator.equals(
    "root has no parent",
    retrievedCategory.parentCategory,
    null,
  );
  TestValidator.equals(
    "root has no children",
    retrievedCategory.childrenCategories.length,
    0,
  );
  TestValidator.equals(
    "category is active (not deleted)",
    retrievedCategory.deleted_at,
    null,
  );
}
