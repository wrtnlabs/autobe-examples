import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_units_create_unit } from "../../../generate/generate_random_shopping_mall_seller_sales_units_create_unit";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_unit } from "../../../prepare/prepare_random_shopping_mall_sale_unit";

/**
 * Test searching and pagination edge cases for sale unit snapshots retrieval.
 * This test includes:
 * - Setup of seller and administrator actors with proper authentication.
 * - Creation of a sale listing by the seller.
 * - Creation of multiple sale units under the sale.
 * - Multiple search queries with different search strings (including partial and exact SKU codes and option values).
 * - Pagination testing including first page, middle page, last page, and beyond last page.
 * - Validation of response pagination metadata against request parameters.
 * - Validation that search results match the search criteria.
 * - Validation that results beyond last page are empty and pagination metadata is correct.
 */
export async function test_api_sale_unit_snapshot_search_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    },
  });
  typia.assert(adminJoinOutput);
  // Login as administrator
  const adminLoginOutput = await authorize_administrator_login(
    adminConnection,
    {
      body: {
        email: adminJoinOutput.email,
        password: adminPassword,
      },
    },
  );
  typia.assert(adminLoginOutput);
  adminConnection.headers = {
    Authorization: `Bearer ${adminLoginOutput.token.access}`,
  };
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerJoinOutput);
  // Login as seller
  const sellerLoginOutput = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinOutput.email,
      password: sellerPassword,
    },
  });
  typia.assert(sellerLoginOutput);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerLoginOutput.token.access}`,
  };
  // 3. Create a sale listing as seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 4. Create multiple sale units under the sale
  const numberOfUnits = 10;
  const units: IShoppingMallSaleUnit[] = [];
  for (let i = 0; i < numberOfUnits; ++i) {
    const sku = `SKU-${RandomGenerator.alphabets(5).toUpperCase()}`;
    const optionValues = JSON.stringify({
      color: RandomGenerator.alphabets(3),
      size: `${(i % 5) + 1}`,
    });
    const unit =
      await generate_random_shopping_mall_seller_sales_units_create_unit(
        sellerConnection,
        {
          params: { saleId: sale.id },
          body: {
            sku_code: sku,
            option_values: optionValues,
            price_override: i % 2 === 0 ? sale.basePrice + i * 10 : null,
          },
        },
      );
    units.push(unit);
  }
  // 5. Define admin request helper
  async function searchSnapshots(
    saleId: string,
    unitId: string,
    search?: string,
    page?: number,
    limit?: number,
  ): Promise<IPageIShoppingMallSaleUnitSnapshot.ISummary> {
    const response =
      await api.functional.shoppingMall.administrator.sales.units.snapshots.indexSnapshots(
        adminConnection,
        {
          saleId,
          unitId,
          body: {
            search,
            page,
            limit,
          },
        },
      );
    typia.assert(response);
    return response;
  }
  // 6. Test search by SKU substring (should match only one unit)
  const sampleUnit = units[2];
  const searchSub = sampleUnit.skuCode.substring(2, 6);
  const page1 = await searchSnapshots(sale.id, sampleUnit.id, searchSub, 1, 5);
  TestValidator.predicate(
    "search results include SKU substring match",
    page1.data.some((s) => s.skuCode.includes(searchSub)),
  );
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 5);
  // 7. Test search with exact SKU
  const pageExact = await searchSnapshots(
    sale.id,
    sampleUnit.id,
    sampleUnit.skuCode,
    1,
    10,
  );
  TestValidator.predicate(
    "search results include exact SKU match",
    pageExact.data.every((s) => s.skuCode === sampleUnit.skuCode),
  );
  TestValidator.equals(
    "pagination current page",
    pageExact.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", pageExact.pagination.limit, 10);
  // 8. Test pagination: retrieve page beyond last page (expect empty results)
  const pageBeyond = await searchSnapshots(
    sale.id,
    sampleUnit.id,
    undefined,
    100,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    pageBeyond.pagination.current,
    100,
  );
  TestValidator.equals("pagination limit", pageBeyond.pagination.limit, 10);
  TestValidator.predicate(
    "pagination data length zero",
    pageBeyond.data.length === 0,
  );
  // 9. Test pagination: retrieve last page
  const totalRecords = pageExact.pagination.records;
  const limit = 3;
  if (totalRecords > 0) {
    const totalPages = Math.ceil(totalRecords / limit);
    const lastPageQuery = await searchSnapshots(
      sale.id,
      sampleUnit.id,
      undefined,
      totalPages,
      limit,
    );
    TestValidator.equals(
      "last page current",
      lastPageQuery.pagination.current,
      totalPages,
    );
    TestValidator.equals(
      "last page limit",
      lastPageQuery.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "last page data length less than or equal limit",
      lastPageQuery.data.length <= limit,
    );
  }
  // 10. Test search by option value substring
  const optionValueStr = JSON.parse(sampleUnit.optionValues).color as string;
  const optionSearchSub = optionValueStr.substring(0, 2);
  const optionSearchResult = await searchSnapshots(
    sale.id,
    sampleUnit.id,
    optionSearchSub,
    1,
    5,
  );
  TestValidator.predicate(
    "option search results include option substring match",
    optionSearchResult.data.some((s) =>
      s.optionValues.includes(optionSearchSub),
    ),
  );
  TestValidator.equals(
    "option search pagination current",
    optionSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "option search pagination limit",
    optionSearchResult.pagination.limit,
    5,
  );
}
