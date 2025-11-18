import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate descendants pagination metadata and page size behavior.
 *
 * Business goal:
 *
 * - Ensure that when a category has many descendants, the descendants index
 *   endpoint returns correct pagination metadata and that the first page of
 *   data respects the pagination.limit field.
 * - Confirm that the total record count and pages indicate a multi-page result
 *   when there are more descendants than a single page can hold.
 *
 * Steps:
 *
 * 1. Join as an admin to obtain authorization for admin-only category creation.
 * 2. Create a single root category A (parent_id = null).
 * 3. Create at least 15 child categories under A (parent_id = A.id).
 * 4. Call descendants.index for A.id.
 * 5. Validate pagination metadata: records >= created descendants, pages >= 2.
 * 6. Validate that data.length <= pagination.limit for the first page.
 * 7. Validate that data contains only categories that are descendants of A and
 *    that there are no duplicate category ids.
 */
export async function test_api_category_descendants_pagination_behavior(
  connection: api.IConnection,
) {
  // 1. Join as an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create root category A
  const rootCreateBody = {
    parent_id: null,
    slug: `root-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Root Category A",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: rootCreateBody,
    });
  typia.assert(rootCategory);

  // 3. Create many child categories under A
  const childCount = 15;
  const children: IShoppingMallCategory[] = await ArrayUtil.asyncRepeat(
    childCount,
    async (index) => {
      const childBody = {
        parent_id: rootCategory.id,
        slug: `child-${index + 1}-${RandomGenerator.alphaNumeric(4)}`,
        name_en: `Child Category ${index + 1}`,
        description_en: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        sort_order: (index + 1) as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate;

      const created: IShoppingMallCategory =
        await api.functional.shoppingMall.admin.categories.create(connection, {
          body: childBody,
        });
      typia.assert(created);
      return created;
    },
  );

  // 4. Call descendants.index for the root category
  const descendantsPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.descendants.index(connection, {
      categoryId: rootCategory.id,
    });
  typia.assert(descendantsPage);

  const { pagination, data } = descendantsPage;

  // 5. Validate pagination metadata
  TestValidator.predicate(
    "records should be at least the number of created children",
    pagination.records >= children.length,
  );

  TestValidator.predicate(
    "pages should be at least 2 when many descendants exist",
    pagination.pages >= 2,
  );

  // 6. Validate that data length on first page does not exceed limit
  TestValidator.predicate(
    "first page data length must not exceed pagination.limit",
    data.length <= pagination.limit,
  );

  // 7. Validate data contains only descendants of A and has no duplicates
  // We at least ensure:
  // - each record has non-null id
  // - ids are unique within this page
  // - parent_id is either the root or another category (cannot fully walk
  //   the tree without an additional API, so we only check basic consistency).

  const ids = data.map((c) => c.id);
  const uniqueIds = new Set(ids);

  TestValidator.equals(
    "no duplicate category ids within first page data",
    ids.length,
    uniqueIds.size,
  );

  await ArrayUtil.asyncForEach(data, async (category) => {
    TestValidator.predicate(
      "category id must be non-empty string",
      category.id.length > 0,
    );

    // parent_id on descendants should typically not be null, but root may
    // or may not be included depending on implementation. We only assert
    // that if parent_id is null, then this record is the root itself.
    if (category.parent_id === null || category.parent_id === undefined) {
      TestValidator.equals(
        "only the root may have null parent_id",
        category.id,
        rootCategory.id,
      );
    }
  });
}
