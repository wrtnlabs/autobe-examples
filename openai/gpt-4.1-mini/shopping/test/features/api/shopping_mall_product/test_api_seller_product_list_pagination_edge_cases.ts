import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test pagination edge cases including requesting a page beyond the last available page and requesting the last page in the product list.
 * Validate that the API returns an empty list when the page is out of bounds and that the last page returns the appropriate number of records.
 * Also test behavior with no products available (empty database) and confirm the API responds gracefully with empty pagination information and data list.
 * These tests ensure robustness of pagination logic.
 */
export async function test_api_seller_product_list_pagination_edge_cases(
  connection: IConnection,
): Promise<void> {
  // Step 1: Register and authenticate seller
  const sellerConnection: IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  // Update sellerConnection headers with authorization token
  sellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // Step 2: Initial fetch with empty database
  {
    const response = await api.functional.shoppingMall.seller.products.index(
      sellerConnection,
      {
        body: {},
      },
    );
    typia.assert(response);
    TestValidator.equals("empty data list", response.data.length, 0);
    TestValidator.equals("empty total records", response.pagination.records, 0);
    TestValidator.equals("empty total pages", response.pagination.pages, 0);
    TestValidator.equals("empty current page", response.pagination.current, 1);
  }
  // Step 3: Since request body is empty and pagination cannot be controlled from request,
  // test that multiple calls return consistent pagination info and data list
  for (let i = 0; i < 3; ++i) {
    const response = await api.functional.shoppingMall.seller.products.index(
      sellerConnection,
      {
        body: {},
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      `call ${i + 1} data length consistent`,
      response.data.length === 0,
    );
    TestValidator.equals(
      `call ${i + 1} current page is 1`,
      response.pagination.current,
      1,
    );
  }
  // Note: Due to the empty request type for searching product list, page and limit cannot be set,
  // so testing pagination behaviors such as requesting pages beyond last page or last page
  // is not possible with the current API specification and DTOs.
}
