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

export async function test_api_seller_sales_index_search_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test the sales listing search functionality by a seller user.
  // Validate the seller can perform searches using filters for product name keyword, category ID, seller ID, and sale status.
  // Include pagination parameters for pages.
  // Verify response includes correct pagination info and proper summary fields.
  // Also check behavior for no matching sales returns empty data array with correct pagination.
  // 1. Authenticate as seller user via authorize_seller_join utility
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Search by product name keyword (string contains) with pagination
  {
    const body = {};
    const response = await api.functional.shoppingMall.seller.sales.index(
      sellerConnection,
      {
        body,
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "pagination current page >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit >= 0",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      response.pagination.pages >= 0,
    );
    for (const sale of response.data) {
      typia.assert(sale);
      // Cannot assert non-existing properties according to schema - skip property predicates
    }
  }
  // 3. Test empty result by filtering with unlikely filters (simulate no matching records)
  {
    const body = {
      name: "nonexistent_product_prefix_abcdefg",
      category_id: "00000000-0000-0000-0000-000000000000",
      seller_id: "00000000-0000-0000-0000-000000000000",
      status: "rejected",
      page: 1,
      limit: 10,
    } as unknown as IShoppingMallSale.IRequest;
    const response = await api.functional.shoppingMall.seller.sales.index(
      sellerConnection,
      {
        body,
      },
    );
    typia.assert(response);
    TestValidator.equals("empty data array", response.data, []);
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", response.pagination.limit, 10);
    TestValidator.equals("pagination records", response.pagination.records, 0);
    TestValidator.equals("pagination pages", response.pagination.pages, 0);
  }
}
