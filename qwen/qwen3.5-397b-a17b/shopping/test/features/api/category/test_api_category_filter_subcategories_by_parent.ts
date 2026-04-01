import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_filter_subcategories_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create first parent category
  const parentCategory1 =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory1);
  // 3. Create multiple subcategories under first parent
  const subcategoryCount = 3;
  const subcategories1 = await Promise.all(
    ArrayUtil.repeat(subcategoryCount, async () => {
      const subcategory =
        await generate_random_shopping_mall_administrator_categories_create(
          adminConnection,
          {
            body: {
              name: RandomGenerator.name(2),
              description: RandomGenerator.paragraph({ sentences: 2 }),
              parent_id: parentCategory1.id,
            } satisfies IShoppingMallCategory.ICreate,
          },
        );
      return subcategory;
    }),
  );
  // 4. Create second parent category for isolation test
  const parentCategory2 =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory2);
  // 5. Create subcategories under second parent
  const subcategories2 = await Promise.all(
    ArrayUtil.repeat(2, async () => {
      const subcategory =
        await generate_random_shopping_mall_administrator_categories_create(
          adminConnection,
          {
            body: {
              name: RandomGenerator.name(2),
              description: RandomGenerator.paragraph({ sentences: 2 }),
              parent_id: parentCategory2.id,
            } satisfies IShoppingMallCategory.ICreate,
          },
        );
      return subcategory;
    }),
  );
  // 6. Filter subcategories by first parent_id
  const filteredResult1 = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        parent_id: parentCategory1.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(filteredResult1);
  // 7. Validate filtered results for first parent
  TestValidator.equals(
    "subcategory count matches",
    filteredResult1.data.length,
    subcategoryCount,
  );
  for (const subcategory of filteredResult1.data) {
    // Verify parent reference
    TestValidator.equals(
      "parent ID matches",
      subcategory.parent?.id,
      parentCategory1.id,
    );
    // Verify hasChildren is false (one-level nesting only)
    TestValidator.predicate(
      "subcategories have no children",
      !subcategory.hasChildren,
    );
    // Verify subcategory belongs to the created list
    const exists = subcategories1.some((s) => s.id === subcategory.id);
    TestValidator.predicate("subcategory exists in created list", exists);
  }
  // 8. Filter subcategories by second parent_id for isolation test
  const filteredResult2 = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        parent_id: parentCategory2.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(filteredResult2);
  // 9. Validate isolation between category trees
  TestValidator.equals(
    "second parent subcategory count",
    filteredResult2.data.length,
    2,
  );
  for (const subcategory of filteredResult2.data) {
    TestValidator.equals(
      "parent ID matches second parent",
      subcategory.parent?.id,
      parentCategory2.id,
    );
    // Ensure no cross-contamination
    const belongsToFirstParent = subcategories1.some(
      (s) => s.id === subcategory.id,
    );
    TestValidator.predicate(
      "no cross-contamination between trees",
      !belongsToFirstParent,
    );
  }
  // 10. Test with null parent_id to get top-level categories
  const topLevelResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        parent_id: null,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelResult);
  // Verify top-level categories include our parent categories
  const parentIds = topLevelResult.data.map((c) => c.id);
  TestValidator.predicate(
    "first parent in top-level",
    parentIds.includes(parentCategory1.id),
  );
  TestValidator.predicate(
    "second parent in top-level",
    parentIds.includes(parentCategory2.id),
  );
}