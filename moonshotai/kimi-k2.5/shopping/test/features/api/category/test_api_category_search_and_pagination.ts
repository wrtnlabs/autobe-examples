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

export async function test_api_category_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create test categories with searchable names
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  const subcategory1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Mobile Phones",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory1);
  const subcategory2 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory2);
  const fashionElectronics =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Fashion Electronics",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(fashionElectronics);
  const electronicParts =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronic Parts",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(electronicParts);
  const unrelatedCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Fashion Clothing",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(unrelatedCategory);
  // 3. Test search by name (partial matching with 'Electronic')
  const searchResult = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {
        search: "Electronic",
        limit: 10,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate search results contain the search term in their names
  TestValidator.predicate(
    "search results contain 'Electronic'",
    searchResult.data.every((cat) =>
      cat.name.toLowerCase().includes("electronic"),
    ),
  );
  TestValidator.predicate(
    "Fashion Electronics found in search",
    searchResult.data.some((cat) => cat.name === "Fashion Electronics"),
  );
  TestValidator.predicate(
    "Electronic Parts found in search",
    searchResult.data.some((cat) => cat.name === "Electronic Parts"),
  );
  TestValidator.predicate(
    "Electronics found in search",
    searchResult.data.some((cat) => cat.name === "Electronics"),
  );
  TestValidator.predicate(
    "Fashion Clothing should not appear in Electronic search",
    !searchResult.data.some((cat) => cat.name === "Fashion Clothing"),
  );
  // 4. Test pagination with limit and page
  const limitedResult = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(limitedResult);
  TestValidator.equals(
    "pagination current page",
    limitedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", limitedResult.pagination.limit, 2);
  TestValidator.predicate(
    "pagination has more records",
    limitedResult.pagination.records >= 6,
  );
  TestValidator.predicate(
    "data array length matches limit",
    limitedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    limitedResult.pagination.pages >= 3,
  );
  // Test second page
  const page2Result = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {
        limit: 2,
        page: 2,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.predicate(
    "page 2 has different data",
    limitedResult.data.length > 0 && page2Result.data.length > 0
      ? limitedResult.data[0].id !== page2Result.data[0].id
      : true,
  );
  // 5. Test search combined with parentId filter
  const subcategorySearchResult =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        parentId: parentCategory.id,
        search: "Mobile",
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(subcategorySearchResult);
  TestValidator.predicate(
    "search within parentId returns correct subcategories",
    subcategorySearchResult.data.every(
      (cat) =>
        cat.parentId === parentCategory.id &&
        cat.name.toLowerCase().includes("mobile"),
    ),
  );
  TestValidator.predicate(
    "Mobile Phones found in parent-scoped search",
    subcategorySearchResult.data.some((cat) => cat.name === "Mobile Phones"),
  );
  // Verify parent category does not appear when filtering by parentId
  TestValidator.predicate(
    "parent category not shown in child search results",
    !subcategorySearchResult.data.some((cat) => cat.id === parentCategory.id),
  );
  // 6. Verify ordering (createdAt descending - newest first)
  if (searchResult.data.length >= 2) {
    const isOrderedByCreatedAtDesc = searchResult.data.every((cat, index) => {
      if (index === 0) return true;
      return (
        new Date(cat.createdAt).getTime() <=
        new Date(searchResult.data[index - 1].createdAt).getTime()
      );
    });
    TestValidator.predicate(
      "results ordered by createdAt descending",
      isOrderedByCreatedAtDesc,
    );
  }
}
