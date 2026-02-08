import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_promotion_index_filter_by_active_and_promotion_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Request body: empty due to no filtering properties in DTO
  const requestBody: IShoppingMallSalePromotion.IRequest = {};
  // 3. Call sale promotions index API
  const response =
    await api.functional.shoppingMall.administrator.sale_promotions.index(
      adminConnection,
      { body: requestBody },
    );
  // 4. Assert complete response structure
  typia.assert(response);
  // 5. Assert that data is array
  if (response.data && Array.isArray(response.data)) {
    for (const item of response.data) {
      // Assert each item conforms to ISummary (empty object, so just assert type)
      typia.assert<IShoppingMallSalePromotion.ISummary>(item);
    }
  }
}
