import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnit";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_sale_unit_listing_filter_pagination_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Create join body for customer (empty namespace, so empty object)
  const joinBody: IShoppingMallCustomer.IJoin = {};
  // Authorize customer join utility function
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  // Set Authorization header for customer connection
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare filter criteria for sale units
  // Since IShoppingMallSaleUnit.IRequest is empty namespace (unknown structure from definition),
  // we pass an empty object simulating no filter
  const saleUnitRequest: IShoppingMallSaleUnit.IRequest = {};
  // 3. Call sale_units.index endpoint with customer connection
  const response: IPageIShoppingMallSaleUnit.ISummary =
    await api.functional.shoppingMall.customer.sale_units.index(
      customerConnection,
      {
        body: saleUnitRequest,
      },
    );
  // Assert that response matches the expected schema
  typia.assert(response);
  // 4. Validate pagination metadata fields
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  // Pagination pages validation:
  // When records is zero, pages must be zero
  // Otherwise, pages must be Math.ceil(records / limit)
  TestValidator.predicate("pagination pages are consistent", () =>
    response.pagination.records === 0
      ? response.pagination.pages === 0
      : response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Validate each sale unit summary's essential properties (assuming some properties exist)
  // Since IShoppingMallSaleUnit.ISummary is an empty namespace, we can't validate internal properties
  // We just assert each element conforms to typia type
  for (const saleUnit of response.data) {
    typia.assert(saleUnit);
  }
}
