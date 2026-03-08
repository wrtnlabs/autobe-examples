import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCategoryAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoryAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategoryAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategoryAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test category analytics parent filter functionality.
 * 1. Authenticate as administrator
 * 2. Create parent category A with multiple subcategories
 * 3. Create parent category B with its own subcategories
 * 4. Query analytics with parent_category_id set to parent A's UUID
 * 5. Verify only subcategories of parent A appear in results
 * 6. Verify parent field in each result references parent A
 * 7. Query analytics with parent_category_id=null to get top-level categories
 * 8. Verify only parent categories appear (not subcategories)
 */
export async function test_api_category_analytics_parent_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create parent category A with multiple subcategories
  const parentCategoryA =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Parent Category A ${RandomGenerator.alphabets(4)}`,
          description: "Top-level parent category A",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategoryA);
  const subcategoryA1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Subcategory A1 ${RandomGenerator.alphabets(4)}`,
          description: "Subcategory under parent A",
          parent_id: parentCategoryA.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategoryA1);
  const subcategoryA2 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Subcategory A2 ${RandomGenerator.alphabets(4)}`,
          description: "Another subcategory under parent A",
          parent_id: parentCategoryA.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategoryA2);
  // 3. Create parent category B with its own subcategories
  const parentCategoryB =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Parent Category B ${RandomGenerator.alphabets(4)}`,
          description: "Top-level parent category B",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategoryB);
  const subcategoryB1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Subcategory B1 ${RandomGenerator.alphabets(4)}`,
          description: "Subcategory under parent B",
          parent_id: parentCategoryB.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategoryB1);
  // 4. Query analytics with parent_category_id set to parent A's UUID
  const parentAAnalytics =
    await api.functional.ecommerceMall.admin.analytics.categories.index(
      adminConnection,
      {
        body: {
          parent_category_id: parentCategoryA.id,
        } satisfies IEcommerceMallCategoryAnalytic.IRequest,
      },
    );
  typia.assert(parentAAnalytics);
  // 5. Verify only subcategories of parent A appear in results
  TestValidator.equals(
    "parent A analytics returns subcategories only",
    parentAAnalytics.data.length,
    2,
  );
  // Verify all returned categories are subcategories of parent A
  const allAreSubcategoriesOfA = parentAAnalytics.data.every(
    (category) => category.parent?.id === parentCategoryA.id,
  );
  TestValidator.predicate("all results have parent A", allAreSubcategoriesOfA);
  // Verify parent category A itself is NOT in results
  const parentANotInResults = !parentAAnalytics.data.some(
    (category) => category.id === parentCategoryA.id,
  );
  TestValidator.predicate(
    "parent category A not in subcategory results",
    parentANotInResults,
  );
  // Verify subcategories of parent B are NOT in results
  const parentBSubcategoriesNotInResults = !parentAAnalytics.data.some(
    (category) => category.id === subcategoryB1.id,
  );
  TestValidator.predicate(
    "parent B subcategories not in parent A results",
    parentBSubcategoriesNotInResults,
  );
  // 6. Verify parent field in each result correctly references parent A
  for (const category of parentAAnalytics.data) {
    TestValidator.equals(
      `subcategory ${category.name} parent reference`,
      category.parent?.id,
      parentCategoryA.id,
    );
    TestValidator.predicate(
      `subcategory ${category.name} has valid parent`,
      category.parent !== null,
    );
  }
  // 7. Query analytics with parent_category_id=null to get top-level categories
  const topLevelAnalytics =
    await api.functional.ecommerceMall.admin.analytics.categories.index(
      adminConnection,
      {
        body: {
          parent_category_id: undefined,
        } satisfies IEcommerceMallCategoryAnalytic.IRequest,
      },
    );
  typia.assert(topLevelAnalytics);
  // 8. Verify only parent categories appear (not subcategories)
  const allAreTopLevel = topLevelAnalytics.data.every(
    (category) => category.parent === null,
  );
  TestValidator.predicate(
    "top-level query returns only parent categories",
    allAreTopLevel,
  );
  // Verify parent categories A and B are in results
  const parentAInTopLevel = topLevelAnalytics.data.some(
    (category) => category.id === parentCategoryA.id,
  );
  TestValidator.predicate(
    "parent category A in top-level results",
    parentAInTopLevel,
  );
  const parentBInTopLevel = topLevelAnalytics.data.some(
    (category) => category.id === parentCategoryB.id,
  );
  TestValidator.predicate(
    "parent category B in top-level results",
    parentBInTopLevel,
  );
  // Verify subcategories are NOT in top-level results
  const subcategoriesNotInTopLevel = !topLevelAnalytics.data.some(
    (category) =>
      category.id === subcategoryA1.id ||
      category.id === subcategoryA2.id ||
      category.id === subcategoryB1.id,
  );
  TestValidator.predicate(
    "subcategories not in top-level results",
    subcategoriesNotInTopLevel,
  );
}