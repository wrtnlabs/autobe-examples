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

export async function test_api_sale_specification_list_exact_value_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving sale specifications with empty filters to validate
  // authorization and pagination response structure.
  // 1. Authorize as seller via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Inject authorization token to sellerConnection
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Valid request with empty filter object
  const response =
    await api.functional.shoppingMall.seller.sale_specifications.index(
      sellerConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate pagination meta
  TestValidator.predicate(
    "pagination current page at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  // 4. Validate data array existence
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Authorization enforcement: try call without authorization and expect error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.shoppingMall.seller.sale_specifications.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
