import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_product_search_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Search without filters - validate response structure
  const emptyResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "response has data array",
    Array.isArray(emptyResult.data),
  );
  TestValidator.predicate(
    "response has pagination",
    emptyResult.pagination !== undefined,
  );
  // 3. Test search with pagination defaults
  const paginatedResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    paginatedResult.pagination !== undefined,
  );
  TestValidator.equals("page is 1", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit is 20", paginatedResult.pagination.limit, 20);
  TestValidator.predicate(
    "records is number",
    typeof paginatedResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof paginatedResult.pagination.pages === "number",
  );
  // 4. Test search with name query filter
  const nameQueryResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          query: "test",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(nameQueryResult);
  TestValidator.predicate(
    "name query response valid",
    nameQueryResult.data !== undefined,
  );
  // 5. Test search with price range filters
  const priceRangeResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          minPrice: 100,
          maxPrice: 500,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceRangeResult);
  TestValidator.predicate(
    "price range response valid",
    priceRangeResult.data !== undefined,
  );
  // 6. Test search with inStock filter
  const inStockResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          inStock: true,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(inStockResult);
  TestValidator.predicate(
    "inStock response valid",
    inStockResult.data !== undefined,
  );
  // 7. Test sort options
  const sortNewestResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          sort: "newest",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(sortNewestResult);
  const sortPriceAscResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          sort: "price_asc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(sortPriceAscResult);
  const sortPriceDescResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          sort: "price_desc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(sortPriceDescResult);
  // 8. Test combined filters
  const combinedResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          query: "product",
          minPrice: 10,
          maxPrice: 1000,
          inStock: true,
          sort: "price_asc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters response valid",
    combinedResult.data !== undefined,
  );
  // 9. Validate all returned products (if any) have valid structure
  for (const product of paginatedResult.data) {
    typia.assert(product);
    TestValidator.predicate("product has id", product.id !== undefined);
    TestValidator.predicate("product has name", product.name !== undefined);
    TestValidator.predicate(
      "product has basePrice",
      typeof product.basePrice === "number",
    );
    TestValidator.predicate(
      "product has categoryName",
      product.categoryName !== undefined,
    );
    TestValidator.predicate(
      "product has hasStock",
      typeof product.hasStock === "boolean",
    );
    TestValidator.predicate(
      "product has createdAt",
      product.createdAt !== undefined,
    );
    TestValidator.predicate(
      "product has updatedAt",
      product.updatedAt !== undefined,
    );
  }
  // 10. Validate combined result respects price range (if products exist)
  for (const product of combinedResult.data) {
    TestValidator.predicate(
      "price within range",
      product.basePrice >= 10 && product.basePrice <= 1000,
    );
  }
  // 11. Validate combined result respects inStock filter (if products exist)
  for (const product of combinedResult.data) {
    TestValidator.equals("inStock product has stock", product.hasStock, true);
  }
  // 12. Test pagination with limit
  const limitedResult =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals(
    "limit respects page size",
    limitedResult.pagination.limit,
    5,
  );
  // 13. Test pagination with different page
  const page2Result =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 has current = 2",
    page2Result.pagination.current,
    2,
  );
}
