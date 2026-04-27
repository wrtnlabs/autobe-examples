import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that soft-deleted categories are excluded from the category hierarchy response, and that cascading deletion of subcategories when their parent is deleted also removes them from the hierarchy.
 *
 * Validates that the `PATCH /eCommerceMall/administrator/categories/hierarchy` endpoint excludes soft-deleted categories from the result. Also verifies that deleting a top-level category cascades to its subcategories, removing them from the hierarchy as well.
 *
 * Special attention is given to ensuring that remaining non-deleted categories still have `deleted_at` as null, confirming that the exclusion is specific to deleted categories and not a systemic filtering issue.
 *
 * 1. Authenticate as an administrator.
 * 2. Create top-level categories 'Books' and 'Sports'.
 * 3. Create a subcategory 'Fiction' under 'Books'.
 * 4. Fetch hierarchy before any deletion — verify Books, Sports, and Fiction are present.
 * 5. Delete the 'Sports' category.
 * 6. Fetch hierarchy — verify Sports is excluded but Books and Fiction remain.
 * 7. Delete the 'Books' category (cascade deletes Fiction).
 * 8. Fetch hierarchy — verify both Books and Fiction are excluded; topLevelCategories is empty.
 */
export async function test_api_category_hierarchy_excludes_deleted_categories(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  // Step 2: Create top-level categories
  const books =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Books",
          description: "Fiction and non-fiction books",
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(books);
  const sports =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Sports",
          description: "Sports equipment and gear",
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(sports);
  // Step 3: Create a subcategory under Books
  const fiction =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Fiction",
          description: "Fiction books",
          parent_id: books.id,
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(fiction);
  // Step 4: Fetch hierarchy before deletion
  const hierarchyBeforeBody =
    {} satisfies IECommerceMallCategory.IHierarchyRequest;
  const hierarchyBefore =
    await api.functional.eCommerceMall.administrator.categories.hierarchy.search(
      adminConnection,
      { body: hierarchyBeforeBody },
    );
  typia.assert(hierarchyBefore);
  TestValidator.predicate(
    "Books exists in hierarchy before deletion",
    hierarchyBefore.topLevelCategories.some((c) => c.id === books.id),
  );
  TestValidator.predicate(
    "Sports exists in hierarchy before deletion",
    hierarchyBefore.topLevelCategories.some((c) => c.id === sports.id),
  );
  const booksNodeBefore = hierarchyBefore.topLevelCategories.find(
    (c) => c.id === books.id,
  );
  TestValidator.predicate(
    "Fiction subcategory exists under Books before deletion",
    booksNodeBefore !== undefined &&
      booksNodeBefore.subcategories.some((c) => c.id === fiction.id),
  );
  // Verify all categories have deleted_at as null before deletion
  for (const top of hierarchyBefore.topLevelCategories) {
    TestValidator.predicate(
      `top-level category "${top.name}" has deleted_at null before deletion`,
      top.deleted_at === null,
    );
    for (const sub of top.subcategories) {
      TestValidator.predicate(
        `subcategory "${sub.name}" has deleted_at null before deletion`,
        sub.deleted_at === null,
      );
    }
  }
  // Step 5: Delete Sports category
  await api.functional.eCommerceMall.administrator.categories.erase(
    adminConnection,
    { categoryId: sports.id },
  );
  // Step 6: Fetch hierarchy after Sports deletion
  const hierarchyAfterBody =
    {} satisfies IECommerceMallCategory.IHierarchyRequest;
  const hierarchyAfter =
    await api.functional.eCommerceMall.administrator.categories.hierarchy.search(
      adminConnection,
      { body: hierarchyAfterBody },
    );
  typia.assert(hierarchyAfter);
  TestValidator.predicate(
    "Sports is excluded from hierarchy after deletion",
    hierarchyAfter.topLevelCategories.every((c) => c.id !== sports.id),
  );
  TestValidator.predicate(
    "Books still present in hierarchy after Sports deletion",
    hierarchyAfter.topLevelCategories.some((c) => c.id === books.id),
  );
  const booksNodeAfter = hierarchyAfter.topLevelCategories.find(
    (c) => c.id === books.id,
  );
  TestValidator.predicate(
    "Fiction still present under Books after Sports deletion",
    booksNodeAfter !== undefined &&
      booksNodeAfter.subcategories.some((c) => c.id === fiction.id),
  );
  // Verify remaining categories still have deleted_at as null
  for (const top of hierarchyAfter.topLevelCategories) {
    TestValidator.predicate(
      `remaining top-level category "${top.name}" has deleted_at null`,
      top.deleted_at === null,
    );
    for (const sub of top.subcategories) {
      TestValidator.predicate(
        `remaining subcategory "${sub.name}" has deleted_at null`,
        sub.deleted_at === null,
      );
    }
  }
  // Step 7: Delete Books category (cascade deletes Fiction)
  await api.functional.eCommerceMall.administrator.categories.erase(
    adminConnection,
    { categoryId: books.id },
  );
  // Step 8: Fetch hierarchy after Books deletion
  const hierarchyFinalBody =
    {} satisfies IECommerceMallCategory.IHierarchyRequest;
  const hierarchyFinal =
    await api.functional.eCommerceMall.administrator.categories.hierarchy.search(
      adminConnection,
      { body: hierarchyFinalBody },
    );
  typia.assert(hierarchyFinal);
  TestValidator.equals(
    "topLevelCategories is empty after all categories deleted",
    hierarchyFinal.topLevelCategories.length,
    0,
  );
}
