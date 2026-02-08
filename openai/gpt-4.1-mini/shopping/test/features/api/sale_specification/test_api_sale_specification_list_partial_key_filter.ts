import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSpecification";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_specification_list_partial_key_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving sale specifications with empty filter body to test access control and pagination
  // 1. Authorize a seller
  const sellerAuthorized = await authorize_seller_join(
    { host: connection.host },
    { body: {} },
  );
  typia.assert(sellerAuthorized);
  // 2. Prepare seller connection
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuthorized.token.access}` },
  };
  // 3. Call the sale specifications list endpoint with empty request body
  const response: IPageIShoppingMallSaleSpecification.ISummary =
    await api.functional.shoppingMall.seller.sale_specifications.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 4. Basic pagination validation
  TestValidator.predicate(
    "pagination current positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= current",
    response.pagination.pages >= response.pagination.current,
  );
  // 5. Unauthorized access test: use base connection without auth header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.shoppingMall.seller.sale_specifications.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
