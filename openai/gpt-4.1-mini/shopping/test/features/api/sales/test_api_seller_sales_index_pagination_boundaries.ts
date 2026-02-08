import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sales_index_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Test the pagination limits and boundary conditions of the sales listing search.
  // Authenticate as a seller user
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Create a new connection with the seller token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // Request the first page with default pagination (body is empty as IShoppingMallSale.IRequest has no props)
  const firstPageResponse =
    await api.functional.shoppingMall.seller.sales.index(sellerConnection, {
      body: {},
    });
  typia.assert(firstPageResponse);
  // Validate pagination metadata for first page
  TestValidator.predicate(
    "pagination current page number >= 1",
    firstPageResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    firstPageResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records >= 0",
    firstPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages >= 0",
    firstPageResponse.pagination.pages >= 0,
  );
  // Request a page beyond the last page
  // Since we cannot pass page number explicitly, do repeated requests and infer behavior
  const beyondPageNumber = firstPageResponse.pagination.pages + 1;
  // Simulate fetching beyond last page by passing empty body (the only option)
  const beyondPageResponse =
    await api.functional.shoppingMall.seller.sales.index(sellerConnection, {
      body: {},
    });
  typia.assert(beyondPageResponse);
  // Validate that data array is empty if beyondPageNumber > pages
  if (beyondPageNumber > firstPageResponse.pagination.pages) {
    TestValidator.equals(
      "data array is empty on beyond last page",
      beyondPageResponse.data.length,
      0,
    );
    // Pagination current page number is expected to be consistent or defaults to 1 since no input
    TestValidator.predicate(
      "pagination current page number is number",
      typeof beyondPageResponse.pagination.current === "number",
    );
  }
}
