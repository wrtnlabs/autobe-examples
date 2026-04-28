import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCategory";
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
 * Test browsing the complete category hierarchy to verify parent-child relationships.
 *
 * Validates the category browsing endpoint exposes correct parent-child relationships in the paginated results. An administrator creates a root category and a subcategory under it. The public category browsing endpoint is then called to retrieve all active categories. Root categories appear with a null parent reference, while subcategories include the parent category's summary information (name, id, description) in the parent field.
 *
 * Ensures the one-level category hierarchy is correctly represented in the API response and that pagination metadata is properly included.
 *
 * 1. Administrator registers and authenticates via join endpoint.
 * 2. Administrator creates a root category without a parent reference.
 * 3. Administrator creates a subcategory under the root category.
 * 4. Call the public category browsing endpoint to retrieve all categories.
 * 5. Validate root category has null parent and subcategory has parent summary.
 * 6. Verify pagination metadata is correctly populated.
 */
export async function test_api_category_browsing_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a root category (no parent)
  const rootCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: { parentEcommercePlatformCategoryId: null },
      },
    );
  typia.assert(rootCategory);
  // 3. Create a subcategory under the root category
  const subCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: { parentEcommercePlatformCategoryId: rootCategory.id },
      },
    );
  typia.assert(subCategory);
  // 4. Call the public category browsing endpoint
  const browsingConnection: api.IConnection = { host: connection.host };
  const pageBody = {} satisfies IEcommercePlatformCategory.IRequest;
  const page = await api.functional.ecommercePlatform.categories.index(
    browsingConnection,
    {
      body: pageBody,
    },
  );
  typia.assert(page);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination records at least 2",
    page.pagination.records >= 2,
  );
  // 6. Find root and subcategory in results
  let foundRoot = page.data.find((c) => c.id === rootCategory.id);
  let foundSub = page.data.find((c) => c.id === subCategory.id);
  typia.assertGuard(foundRoot!);
  typia.assertGuard(foundSub!);
  // 7. Validate root category has null parent
  TestValidator.equals("root category parent is null", foundRoot.parent, null);
  // 8. Validate subcategory has parent summary matching root
  TestValidator.equals(
    "subcategory parent id matches root",
    foundSub.parent!.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches root",
    foundSub.parent!.name,
    foundRoot.name,
  );
  // 9. Validate subcategory itself is present with correct data
  TestValidator.predicate(
    "subcategory was created",
    foundSub.created_at != null,
  );
}