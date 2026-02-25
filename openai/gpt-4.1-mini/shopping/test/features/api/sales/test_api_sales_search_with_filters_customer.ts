import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_sales_search_with_filters_customer(
  connection: api.IConnection,
): Promise<void> {
  // This test covers searching sales as a customer with various filters and pagination
  // 1. Authenticate as a customer by joining
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Authorization headers updated internally by authorize_customer_join
  // 2. Prepare filter criteria with partial name, categoryCode, price_min, price_max, inStock
  //    Using partial name substring and categoryCode from sales retrieval
  // Call sales.index without filters to get some sales for sampling
  const allSales = await api.functional.shoppingMall.sales.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(allSales);
  // Extract all category codes in sales for filtering example
  const categoryCodes = Array.from(
    new Set(allSales.data.map((sale) => sale.category.name)),
  );
  const chosenCategoryCode =
    categoryCodes.length > 0 ? categoryCodes[0] : undefined;
  // Extract a partial name substring from first sale name if available
  const sampleSaleName =
    allSales.data.length > 0 ? allSales.data[0].name : undefined;
  const partialName = sampleSaleName
    ? sampleSaleName.slice(0, Math.floor(sampleSaleName.length / 2)).trim()
    : undefined;
  const MIN_PRICE = 1000;
  const MAX_PRICE = 1000000;
  // 3. Prepare body for filtering and pagination test - try all filter criteria
  const filterRequest: IShoppingMallSale.IRequest = {
    page: 1,
    limit: 5,
    name: partialName,
    categoryCode: chosenCategoryCode,
    price_min: MIN_PRICE,
    price_max: MAX_PRICE,
    inStock: true,
    sort: "price_asc",
  };
  // 4. Call sales.index with ascending price sort
  const filteredAsc = await api.functional.shoppingMall.sales.index(
    customerConnection,
    { body: filterRequest },
  );
  typia.assert(filteredAsc);
  // Validate filter responses: all sales match criteria
  filteredAsc.data.forEach((sale) => {
    TestValidator.predicate(
      `sale name contains partial name (${filterRequest.name})`,
      filterRequest.name ? sale.name.includes(filterRequest.name) : true,
    );
    TestValidator.equals(
      `sale category matches ${filterRequest.categoryCode}`,
      sale.category.name,
      filterRequest.categoryCode ?? sale.category.name,
    );
    TestValidator.predicate(
      `sale price >= min price`,
      sale.basePrice >= (filterRequest.price_min ?? 0),
    );
    TestValidator.predicate(
      `sale price <= max price`,
      sale.basePrice <= (filterRequest.price_max ?? Number.MAX_SAFE_INTEGER),
    );
    // stock status is not directly in sale, so just check if inStock true means API filter is applied
  });
  // 5. Test sorting by price descending
  const filterDescRequest: IShoppingMallSale.IRequest = {
    ...filterRequest,
    sort: "price_desc",
  };
  const filteredDesc = await api.functional.shoppingMall.sales.index(
    customerConnection,
    { body: filterDescRequest },
  );
  typia.assert(filteredDesc);
  // Verify descending order
  for (let i = 1; i < filteredDesc.data.length; i++) {
    TestValidator.predicate(
      "price descending order",
      filteredDesc.data[i - 1].basePrice >= filteredDesc.data[i].basePrice,
    );
  }
  // 6. Test sorting by newest (creation date descending)
  const filterNewestRequest: IShoppingMallSale.IRequest = {
    ...filterRequest,
    sort: "newest",
  };
  const filteredNewest = await api.functional.shoppingMall.sales.index(
    customerConnection,
    { body: filterNewestRequest },
  );
  typia.assert(filteredNewest);
  // Verify newest order by createdAt descending
  for (let i = 1; i < filteredNewest.data.length; i++) {
    TestValidator.predicate(
      "newest sorting order",
      new Date(filteredNewest.data[i - 1].createdAt).getTime() >=
        new Date(filteredNewest.data[i].createdAt).getTime(),
    );
  }
  // 7. Test pagination counts
  const pagination = filteredAsc.pagination;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 5", pagination.limit === 5);
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination records is consistent with data length",
    filteredAsc.data.length <= pagination.records,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // 8. Validate sale summaries contain seller and category information
  filteredAsc.data.forEach((sale) => {
    TestValidator.predicate("sale has seller id", !!sale.seller.id);
    TestValidator.predicate("sale has seller email", !!sale.seller.email);
    TestValidator.predicate("sale has seller shopName", !!sale.seller.shopName);
    TestValidator.predicate("sale has category id", !!sale.category.id);
    TestValidator.predicate("sale has category name", !!sale.category.name);
    TestValidator.predicate(
      "sale has category description",
      typeof sale.category.description === "string",
    );
  });
}
