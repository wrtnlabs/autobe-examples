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
 * Test subcategory filtering by parentId on the category browsing endpoint.
 *
 * Validates that the category browsing endpoint correctly filters results when a parentId parameter is provided. An administrator creates a root category and multiple subcategories under it. The category index endpoint is then called with parentId set to the root category's ID. Verifies that only direct subcategories are returned, excluding the root category itself.
 *
 * Special attention is given to verifying that each returned subcategory includes the parent category's summary information in the parent field, confirming the hierarchical relationship is properly maintained in the response.
 *
 * 1. Administrator authenticates to create and manage categories.
 * 2. Administrator creates a root category without a parent.
 * 3. Administrator creates three subcategories under the root category.
 * 4. Category browsing endpoint is called with parentId filter.
 * 5. Validates that only subcategories belonging to the parent are returned.
 * 6. Verifies each subcategory includes the parent category summary.
 */
export async function test_api_category_subcategory_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create root category
  const rootCategory: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(rootCategory);
  // 3. Create three subcategories under the root category
  const subcategory1: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Phones",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parentEcommercePlatformCategoryId: rootCategory.id,
        },
      },
    );
  typia.assert(subcategory1);
  const subcategory2: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parentEcommercePlatformCategoryId: rootCategory.id,
        },
      },
    );
  typia.assert(subcategory2);
  const subcategory3: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Accessories",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parentEcommercePlatformCategoryId: rootCategory.id,
        },
      },
    );
  typia.assert(subcategory3);
  // 4. Call category browsing endpoint with parentId filter
  const anonymousConnection: api.IConnection = { host: connection.host };
  const paginationResult: IPageIEcommercePlatformCategory.ISummary =
    await api.functional.ecommercePlatform.categories.index(
      anonymousConnection,
      {
        body: {
          parentId: rootCategory.id,
        } satisfies IEcommercePlatformCategory.IRequest,
      },
    );
  typia.assert(paginationResult);
  // 5. Validate that only subcategories are returned
  TestValidator.equals(
    "returns exactly 3 subcategories",
    paginationResult.data.length,
    3,
  );
  TestValidator.equals(
    "data array has 3 items",
    paginationResult.data.length,
    3,
  );
  // 6. Validate each subcategory has correct parent reference
  TestValidator.predicate(
    "all subcategories have root category as parent",
    paginationResult.data.every((cat) => cat.parent?.id === rootCategory.id),
  );
  // 7. Validate root category is NOT included (root has null parent)
  TestValidator.predicate(
    "no root category in results (all have parent)",
    paginationResult.data.every((cat) => cat.parent !== null),
  );
  // 8. Validate subcategory IDs match created subcategories
  const returnedIds = paginationResult.data.map((cat) => cat.id);
  const expectedIds = [
    subcategory1.id,
    subcategory2.id,
    subcategory3.id,
  ].sort();
  TestValidator.equals(
    "returned subcategory IDs match created subcategories",
    returnedIds.sort(),
    expectedIds,
  );
  // 9. Validate parent summary name matches root category name
  TestValidator.equals(
    "parent summary name matches root category",
    paginationResult.data[0].parent?.name,
    rootCategory.name,
  );
}
