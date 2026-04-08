import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
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

export async function test_api_category_list_subcategories_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create parent categories (top-level, no parentId)
  const parentCategory1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 3,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory1);
  const parentCategory2 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 3,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory2);
  // 3. Create subcategories under parentCategory1
  const subcategory1_1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Subcategory 1-1",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory1.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory1_1);
  const subcategory1_2 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Subcategory 1-2",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory1.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory1_2);
  const subcategory1_3 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Subcategory 1-3",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory1.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory1_3);
  // 4. Create subcategories under parentCategory2
  const subcategory2_1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Subcategory 2-1",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory2.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory2_1);
  // 5. List subcategories by parentId (filtering for parentCategory1)
  const subcategoriesOfParent1 =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        parentId: parentCategory1.id,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(subcategoriesOfParent1);
  // 6. Validate results - should only get subcategories of parentCategory1
  TestValidator.equals(
    "subcategory count matches",
    subcategoriesOfParent1.data.length,
    3,
  );
  TestValidator.equals(
    "pagination shows correct count",
    subcategoriesOfParent1.pagination.records,
    3,
  );
  // 7. Verify each returned subcategory has correct parentId reference
  for (const subcategory of subcategoriesOfParent1.data) {
    TestValidator.equals(
      "parentId matches requested parent",
      subcategory.parentId,
      parentCategory1.id,
    );
    // Verify parent summary is populated
    if (subcategory.parent === null || subcategory.parent === undefined) {
      throw new Error("Parent summary should be populated");
    }
    TestValidator.equals(
      "parent summary id matches",
      subcategory.parent.id,
      parentCategory1.id,
    );
    TestValidator.equals(
      "parent summary name matches",
      subcategory.parent.name,
      parentCategory1.name,
    );
  }
  // 8. List subcategories for parentCategory2 and validate isolation
  const subcategoriesOfParent2 =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        parentId: parentCategory2.id,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(subcategoriesOfParent2);
  TestValidator.equals(
    "parent2 subcategory count",
    subcategoriesOfParent2.data.length,
    1,
  );
  TestValidator.equals(
    "parent2 subcategory parentId",
    subcategoriesOfParent2.data[0]!.parentId,
    parentCategory2.id,
  );
  // 9. Verify parent category subcategoryCount is populated correctly
  // Re-fetch parent categories to check subcategoryCount
  const allCategories = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {
        parentId: null,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  const fetchedParent1 = allCategories.data.find(
    (c) => c.id === parentCategory1.id,
  );
  const fetchedParent2 = allCategories.data.find(
    (c) => c.id === parentCategory2.id,
  );
  if (fetchedParent1 === undefined || fetchedParent2 === undefined) {
    throw new Error("Parent categories should be found in list");
  }
  TestValidator.equals(
    "parent1 subcategoryCount is 3",
    fetchedParent1.subcategoryCount,
    3,
  );
  TestValidator.equals(
    "parent2 subcategoryCount is 1",
    fetchedParent2.subcategoryCount,
    1,
  );
  // 10. Verify top-level categories have null parentId
  for (const category of allCategories.data) {
    TestValidator.equals(
      "top-level categories have null parentId",
      category.parentId,
      null,
    );
    TestValidator.equals(
      "top-level categories have null parent summary",
      category.parent,
      null,
    );
  }
}
