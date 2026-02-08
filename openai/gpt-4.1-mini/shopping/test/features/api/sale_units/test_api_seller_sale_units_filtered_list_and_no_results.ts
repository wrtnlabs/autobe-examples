import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnit";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_units_filtered_list_and_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve paginated list of product variant units (sale units) with common filters and pagination.
  {
    // 1. Authenticate as seller by joining a new seller account.
    const sellerJoinConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_seller_join(sellerJoinConnection, {
      body: {},
    });
    sellerJoinConnection.headers = { Authorization: authorized.token.access };
    // 2. Submit a search request with partial sku_code and option_values to test trigram-based partial text search.
    //    Include pagination parameters (e.g., page=1, limit=20).
    const partialSkuCode = "abc";
    const partialOptionValues = "red";
    const page = 1 satisfies number as number;
    const limit = 20 satisfies number as number;
    // Construct request body matching IShoppingMallSaleUnit.IRequest schema; as schema provided has no detailed property,
    // we just include likely filter properties named 'sku_code', 'option_values', 'page' and 'limit' since partial text search
    // and pagination are mentioned in scenario and API description, but since the given DTO definition is empty,
    // it means no required properties exist, so must just pass empty object or structural object matching common parameters.
    // We must adapt to scenario description and the API's specifications.
    // Since no explicit API schema properties were given for filters, we'll pass an empty object to avoid adding non-existent properties.
    // Nonetheless we want to pass pagination and filtering parameters, but the schema IShoppingMallSaleUnit.IRequest is {}
    // So passing {} to respects 'Schema Property Existence Enforcement' rule.
    const requestBody1: IShoppingMallSaleUnit.IRequest = {};
    // 3. Call the sale_units index endpoint
    const response1 = await api.functional.shoppingMall.seller.sale_units.index(
      sellerJoinConnection,
      { body: requestBody1 },
    );
    // 4. Validate response
    typia.assert(response1);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page is positive",
      response1.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      response1.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages are consistent",
      response1.pagination.pages ===
        (response1.pagination.records === 0
          ? 0
          : Math.ceil(
              response1.pagination.records / response1.pagination.limit,
            )),
    );
    // Validate data list is an array
    TestValidator.predicate(
      "sale units data list is array",
      Array.isArray(response1.data),
    );
  }
  // Scenario 2: Search with filters that yield no sale units.
  {
    // 1. Authenticate as seller by joining a new seller account.
    const sellerJoinConnection2: api.IConnection = { host: connection.host };
    const authorized2 = await authorize_seller_join(sellerJoinConnection2, {
      body: {},
    });
    sellerJoinConnection2.headers = { Authorization: authorized2.token.access };
    // 2. Submit a search request with highly restrictive filters that match no sale units.
    // Since IShoppingMallSaleUnit.IRequest schema has no properties, we provide just empty object (no non-existent props).
    const requestBody2: IShoppingMallSaleUnit.IRequest = {};
    // 3. Call the sale_units index endpoint
    const response2 = await api.functional.shoppingMall.seller.sale_units.index(
      sellerJoinConnection2,
      { body: requestBody2 },
    );
    // 4. Validate response returns empty data array with correct pagination metadata showing records=0 and pages=0
    typia.assert(response2);
    TestValidator.equals("empty data array", response2.data.length, 0);
    TestValidator.equals(
      "pagination records count",
      response2.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination pages count",
      response2.pagination.pages,
      0,
    );
  }
}
