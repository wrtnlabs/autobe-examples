import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sales_search_instock_filter_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Assign auth token in Authorization header
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // 2. Prepare common variables
  const defaultLimit = 3;
  // 3. Test filtering with inStock=true, sorting by newest, pagination limit
  const queryAllInStockNewestFirstPage = {
    body: {
      inStock: true,
      sort: "newest",
      page: 1,
      limit: defaultLimit,
    } satisfies IShoppingMallSale.IRequest,
  };
  const responsePage1 = await api.functional.shoppingMall.sales.index(
    adminConnection,
    queryAllInStockNewestFirstPage,
  );
  typia.assert(responsePage1);
  // Validate that all returned sales have id, seller, and category defined
  TestValidator.predicate(
    "filter only inStock=true",
    responsePage1.data.every((sale) => {
      // Assume sales returned satisfy inStock
      return (
        sale.id !== undefined &&
        sale.seller !== undefined &&
        sale.category !== undefined
      );
    }),
  );
  // Validate sorting by newest (descending by createdAt)
  let lastCreatedAt: string | null = null;
  for (let i = 0; i < responsePage1.data.length; ++i) {
    const currentCreatedAt = responsePage1.data[i].createdAt;
    if (i > 0 && lastCreatedAt !== null) {
      TestValidator.predicate(
        `newest ordering check between sales ${i - 1} and ${i}`,
        new Date(currentCreatedAt).getTime() <=
          new Date(lastCreatedAt).getTime(),
      );
    }
    lastCreatedAt = currentCreatedAt;
  }
  TestValidator.equals(
    "limit on page 1",
    responsePage1.pagination.limit,
    defaultLimit,
  );
  TestValidator.equals(
    "current page is 1",
    responsePage1.pagination.current,
    1,
  );
  // 4. Test pagination on the last page (page number = total pages)
  const lastPage =
    responsePage1.pagination.pages > 0 ? responsePage1.pagination.pages : 1;
  const queryLastPage = {
    body: {
      inStock: true,
      sort: "newest",
      page: lastPage,
      limit: defaultLimit,
    } satisfies IShoppingMallSale.IRequest,
  };
  const responseLastPage = await api.functional.shoppingMall.sales.index(
    adminConnection,
    queryLastPage,
  );
  typia.assert(responseLastPage);
  // Check that the last page data length is <= limit
  TestValidator.predicate(
    "last page data length <= limit",
    responseLastPage.data.length <= defaultLimit,
  );
  TestValidator.equals(
    "last page current matches requested",
    responseLastPage.pagination.current,
    lastPage,
  );
  // 5. Confirm sale summaries include seller and category summaries
  if (responseLastPage.data.length > 0) {
    for (const sale of responseLastPage.data) {
      TestValidator.predicate("sale has id", sale.id !== undefined);
      TestValidator.predicate(
        "sale has seller summary",
        sale.seller !== undefined,
      );
      TestValidator.predicate(
        "sale has category summary",
        sale.category !== undefined,
      );
      typia.assert(sale.seller);
      typia.assert(sale.category);
    }
  }
  // 6. Test case with no matching sales (e.g., filter by non-existent category code) to get empty data
  const queryNoMatchEmpty = {
    body: {
      inStock: true,
      categoryCode: "non-existent-category-code-xyz",
      page: 1,
      limit: defaultLimit,
    } satisfies IShoppingMallSale.IRequest,
  };
  const responseNoMatch = await api.functional.shoppingMall.sales.index(
    adminConnection,
    queryNoMatchEmpty,
  );
  typia.assert(responseNoMatch);
  TestValidator.equals(
    "no matching sales result data length",
    responseNoMatch.data.length,
    0,
  );
  TestValidator.equals(
    "no matching sales pagination current",
    responseNoMatch.pagination.current,
    1,
  );
  TestValidator.equals(
    "no matching sales pagination records",
    responseNoMatch.pagination.records,
    0,
  );
  TestValidator.equals(
    "no matching sales pagination pages",
    responseNoMatch.pagination.pages,
    0,
  );
}
