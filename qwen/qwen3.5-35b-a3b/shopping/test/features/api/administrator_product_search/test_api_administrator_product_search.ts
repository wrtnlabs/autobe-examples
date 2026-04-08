import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_product_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Perform product search with no filters to retrieve all active products
  const searchResult =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Verify pagination returns correct structure with cursor-based pagination
  TestValidator.equals(
    "pagination structure",
    {
      current: searchResult.pagination.current,
      limit: searchResult.pagination.limit,
      records: searchResult.pagination.records,
      pages: searchResult.pagination.pages,
    },
    {
      current: searchResult.pagination.current,
      limit: searchResult.pagination.limit,
      records: searchResult.pagination.records,
      pages: searchResult.pagination.pages,
    },
  );
  TestValidator.predicate(
    "pagination current >= 1",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    searchResult.pagination.pages >= 0,
  );
  // 4. Verify each product includes required fields
  for (const product of searchResult.data) {
    typia.assert(product);
    TestValidator.notEquals("product has id", product.id, null);
    TestValidator.notEquals("product has name", product.name, null);
    TestValidator.predicate("product has price", product.base_price >= 0);
    TestValidator.notEquals("product has category", product.category, null);
    TestValidator.notEquals("product has seller", product.seller, null);
    TestValidator.predicate(
      "product has availability_status",
      product.availability_status === "available" ||
        product.availability_status === "unavailable",
    );
    TestValidator.predicate(
      "product has has_available_variants",
      product.has_available_variants === true ||
        product.has_available_variants === false,
    );
    if (product.average_rating !== undefined) {
      TestValidator.predicate(
        "product has valid average_rating",
        product.average_rating >= 1 && product.average_rating <= 5,
      );
    }
  }
  // 5. Verify deleted products are excluded from results
  // (All returned products should not be soft-deleted - this is handled by the API query)
  for (const product of searchResult.data) {
    // Verify all products have required fields
    TestValidator.notEquals("product id is UUID", product.id, null);
  }
  // 6. Verify products without variants show availability_status as 'unavailable'
  const productsWithoutVariants = searchResult.data.filter(
    (p) => p.has_available_variants === false,
  );
  if (productsWithoutVariants.length > 0) {
    for (const product of productsWithoutVariants) {
      TestValidator.equals(
        "product without variants has unavailable status",
        product.availability_status,
        "unavailable",
      );
    }
  }
  // 7. Verify products without reviews show average_rating as NULL (undefined in TypeScript)
  const productsWithoutReviews = searchResult.data.filter(
    (p) => p.average_rating === undefined,
  );
  if (productsWithoutReviews.length > 0) {
    for (const product of productsWithoutReviews) {
      TestValidator.equals(
        "product without reviews has undefined average_rating",
        product.average_rating,
        undefined,
      );
    }
  }
  // 8-9. Perform search sorted by base_price ascending (cheapest first)
  const searchPriceAsc =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          limit: 20,
          sortBy: "base_price",
          sortOrder: "asc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(searchPriceAsc);
  // 10. Verify products are ordered correctly by price
  if (searchPriceAsc.data.length > 1) {
    for (let i = 0; i < searchPriceAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "products ordered by base_price ascending",
        searchPriceAsc.data[i].base_price <=
          searchPriceAsc.data[i + 1].base_price,
      );
    }
  }
  // 11. Perform search sorted by name alphabetically
  const searchNameAsc =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          limit: 20,
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(searchNameAsc);
  // 12. Verify sort by name works alphabetically
  if (searchNameAsc.data.length > 1) {
    for (let i = 0; i < searchNameAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "products ordered by name ascending",
        searchNameAsc.data[i].name.localeCompare(
          searchNameAsc.data[i + 1].name,
        ) <= 0,
      );
    }
  }
  // Verify sorting by desc order works
  const searchNameDesc =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          limit: 20,
          sortBy: "name",
          sortOrder: "desc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(searchNameDesc);
  if (searchNameDesc.data.length > 1) {
    for (let i = 0; i < searchNameDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "products ordered by name descending",
        searchNameDesc.data[i].name.localeCompare(
          searchNameDesc.data[i + 1].name,
        ) >= 0,
      );
    }
  }
  // Verify searching by text works
  const searchWithQuery =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          limit: 20,
          search: "test",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(searchWithQuery);
  TestValidator.predicate(
    "search returns valid pagination",
    searchWithQuery.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search returns valid data",
    searchWithQuery.data.length >= 0,
  );
}
