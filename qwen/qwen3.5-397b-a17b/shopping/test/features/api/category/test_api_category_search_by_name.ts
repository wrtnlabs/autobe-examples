import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create test categories with searchable names and descriptions
  const electronicsCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description:
            "Electronic devices and gadgets including phones, computers, and accessories",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(electronicsCategory);
  const electronicAccessoriesCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronic Accessories",
          description: "Cables, chargers, and other electronic accessories",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(electronicAccessoriesCategory);
  const booksCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Books",
          description: "Physical and digital books for all ages",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(booksCategory);
  const bookStoreSuppliesCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Book Store Supplies",
          description: "Shelving, display units, and supplies for book stores",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(bookStoreSuppliesCategory);
  const homeAppliancesCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Home Appliances",
          description: "Kitchen and household electronic appliances",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(homeAppliancesCategory);
  // 3. Test search with term 'electro' - should match Electronics and Electronic Accessories
  const electroSearchResult =
    await api.functional.shoppingMall.categories.index(adminConnection, {
      body: {
        search: "electro",
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(electroSearchResult);
  TestValidator.predicate(
    "electro search returns at least 2 categories",
    () => electroSearchResult.data.length >= 2,
  );
  const electroMatchIds = electroSearchResult.data.map((c) => c.id);
  TestValidator.predicate("Electronics category found in electro search", () =>
    electroMatchIds.includes(electronicsCategory.id),
  );
  TestValidator.predicate(
    "Electronic Accessories category found in electro search",
    () => electroMatchIds.includes(electronicAccessoriesCategory.id),
  );
  // 4. Test search with term 'supplies' - matches description but not name of Book Store Supplies
  const suppliesSearchResult =
    await api.functional.shoppingMall.categories.index(adminConnection, {
      body: {
        search: "supplies",
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(suppliesSearchResult);
  TestValidator.predicate(
    "supplies search returns at least 1 category",
    () => suppliesSearchResult.data.length >= 1,
  );
  const suppliesMatchIds = suppliesSearchResult.data.map((c) => c.id);
  TestValidator.predicate(
    "Book Store Supplies found by description search",
    () => suppliesMatchIds.includes(bookStoreSuppliesCategory.id),
  );
  // 5. Test search with term 'appliances' - should match Home Appliances by description
  const appliancesSearchResult =
    await api.functional.shoppingMall.categories.index(adminConnection, {
      body: {
        search: "appliances",
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(appliancesSearchResult);
  const appliancesMatchIds = appliancesSearchResult.data.map((c) => c.id);
  TestValidator.predicate("Home Appliances found by description search", () =>
    appliancesMatchIds.includes(homeAppliancesCategory.id),
  );
  // 6. Test search with term that matches no categories
  const noMatchSearchResult =
    await api.functional.shoppingMall.categories.index(adminConnection, {
      body: {
        search: "xyznonexistent123",
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(noMatchSearchResult);
  TestValidator.equals(
    "no match search returns empty data",
    noMatchSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match search records is 0",
    noMatchSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match search pages is 0",
    noMatchSearchResult.pagination.pages,
    0,
  );
  // 7. Test combined search with parent_category_id filter
  // First create a subcategory under Electronics
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronic Components",
          description: "Resistors, capacitors, and other electronic components",
          parent_category_id: electronicsCategory.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  const combinedSearchResult =
    await api.functional.shoppingMall.categories.index(adminConnection, {
      body: {
        search: "electronic",
        parent_category_id: electronicsCategory.id,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(combinedSearchResult);
  TestValidator.predicate(
    "combined search finds subcategory under parent",
    () => combinedSearchResult.data.length >= 1,
  );
  const combinedMatchIds = combinedSearchResult.data.map((c) => c.id);
  TestValidator.predicate(
    "Electronic Components found in combined search",
    () => combinedMatchIds.includes(subcategory.id),
  );
  // 8. Test sorting search results by name ascending
  const sortAscResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        search: "electronic",
        sort: "name,asc",
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortAscResult);
  if (sortAscResult.data.length >= 2) {
    for (let i = 1; i < sortAscResult.data.length; i++) {
      TestValidator.predicate(
        `name ascending order at index ${i}`,
        () =>
          sortAscResult.data[i - 1].name.localeCompare(
            sortAscResult.data[i].name,
          ) <= 0,
      );
    }
  }
  // 9. Test sorting search results by name descending
  const sortDescResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        search: "electronic",
        sort: "name,desc",
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortDescResult);
  if (sortDescResult.data.length >= 2) {
    for (let i = 1; i < sortDescResult.data.length; i++) {
      TestValidator.predicate(
        `name descending order at index ${i}`,
        () =>
          sortDescResult.data[i - 1].name.localeCompare(
            sortDescResult.data[i].name,
          ) >= 0,
      );
    }
  }
}
