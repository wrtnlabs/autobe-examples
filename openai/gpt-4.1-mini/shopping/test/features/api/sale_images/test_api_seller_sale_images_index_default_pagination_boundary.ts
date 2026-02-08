import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_images_index_default_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller for authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Test default pagination with empty filter
  const body: IShoppingMallSaleImage.IRequest = {};
  const result = await api.functional.shoppingMall.seller.sale_images.index(
    sellerConnection,
    { body },
  );
  typia.assert(result);
  // Validate default pagination values
  TestValidator.predicate(
    "default page is first page",
    result.pagination.current === 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records and pages are non-negative",
    result.pagination.records >= 0 && result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    result.data.length <= result.pagination.limit,
  );
}
