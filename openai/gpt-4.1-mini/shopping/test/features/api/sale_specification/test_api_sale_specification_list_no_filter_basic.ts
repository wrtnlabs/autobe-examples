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

export async function test_api_sale_specification_list_no_filter_basic(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a seller by joining
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Prepare an empty request body for no filters
  const body: IShoppingMallSaleSpecification.IRequest = {};
  // Call the sale specification list API
  const output =
    await api.functional.shoppingMall.seller.sale_specifications.index(
      sellerConnection,
      { body },
    );
  typia.assert(output);
  // Validate pagination defaults
  TestValidator.predicate(
    "pagination current page is at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are zero or more",
    output.pagination.pages >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  // For each data item, validate that it conforms to ISummary
  for (const item of output.data) {
    typia.assert(item);
  }
}
