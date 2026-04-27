import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
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

export async function test_api_category_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // Step 2: Create top-level category 'Electronics'
  const electronics =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and gadgets",
        },
      },
    );
  typia.assert(electronics);
  // Step 3: Create top-level category 'Books'
  const books =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Books",
          description: "All kinds of books",
        },
      },
    );
  typia.assert(books);
  // Step 4: Create subcategory 'Fiction' under 'Books'
  const fiction =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Fiction",
          description: "Fictional literature",
          parent_id: books.id,
        },
      },
    );
  typia.assert(fiction);
  // Step 5: Search by exact name 'Electronics'
  const searchElectronics =
    await api.functional.eCommerceMall.administrator.categories.index(
      adminConnection,
      {
        body: {
          search: "Electronics",
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(searchElectronics);
  TestValidator.equals(
    "search by exact name 'Electronics'",
    searchElectronics.data.length,
    1,
  );
  TestValidator.equals(
    "returned category name",
    searchElectronics.data[0]!.name,
    "Electronics",
  );
  // Step 6: Search by partial name 'Book' — should return 'Books' and 'Fiction'
  const searchBook =
    await api.functional.eCommerceMall.administrator.categories.index(
      adminConnection,
      {
        body: {
          search: "Book",
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(searchBook);
  TestValidator.equals(
    "search by partial name 'Book'",
    searchBook.data.length,
    2,
  );
  TestValidator.predicate(
    "'Books' in partial search results",
    searchBook.data.some((c) => c.name === "Books"),
  );
  TestValidator.predicate(
    "'Fiction' in partial search results (inherited via parent name match or own name match)",
    searchBook.data.some((c) => c.name === "Fiction"),
  );
  // Step 7: Filter by parent_id = null — top-level categories only
  const topLevel =
    await api.functional.eCommerceMall.administrator.categories.index(
      adminConnection,
      {
        body: {
          parent_id: null,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(topLevel);
  TestValidator.equals("top-level categories count", topLevel.data.length, 2);
  TestValidator.predicate(
    "'Electronics' is top-level",
    topLevel.data.some((c) => c.name === "Electronics"),
  );
  TestValidator.predicate(
    "'Books' is top-level",
    topLevel.data.some((c) => c.name === "Books"),
  );
  // Step 8: Filter by parent_id = Books' id — subcategories of Books
  const fictionFilter =
    await api.functional.eCommerceMall.administrator.categories.index(
      adminConnection,
      {
        body: {
          parent_id: books.id,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(fictionFilter);
  TestValidator.equals(
    "subcategories of Books count",
    fictionFilter.data.length,
    1,
  );
  TestValidator.equals(
    "subcategory name",
    fictionFilter.data[0]!.name,
    "Fiction",
  );
  // Step 9: Pagination test (page=1, limit=1)
  const paginated =
    await api.functional.eCommerceMall.administrator.categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination: returned 1 record",
    paginated.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination: current page is 1",
    paginated.pagination.current === 1,
  );
  TestValidator.equals("pagination: limit is 1", paginated.pagination.limit, 1);
  TestValidator.predicate(
    "pagination: total records >= 3",
    paginated.pagination.records >= 3,
  );
}
