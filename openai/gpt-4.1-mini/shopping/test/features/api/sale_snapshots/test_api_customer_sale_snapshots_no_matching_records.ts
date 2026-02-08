import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_snapshots_no_matching_records(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that querying sale snapshots with no records returns empty data and pagination indicating zero records.
  // Step 1: Register a new customer and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Update headers for authenticated requests
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Step 2: Call PATCH /shoppingMall/customer/sale-snapshots with empty filter (since no filters are defined)
  const response =
    await api.functional.shoppingMall.customer.sale_snapshots.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // Validate that the response contains empty data array
  TestValidator.equals("empty data array", response.data.length, 0);
  // Validate pagination info reflects zero records and pages
  TestValidator.equals("records count zero", response.pagination.records, 0);
  TestValidator.equals("pages count zero", response.pagination.pages, 0);
  // Validate current page and limit have sensible values
  TestValidator.predicate(
    "current page minimum 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit non-negative", response.pagination.limit >= 0);
}
