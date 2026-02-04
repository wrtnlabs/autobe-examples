import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerAccountStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerAccountStatusHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAccountStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAccountStatusHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_account_status_history_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  // Step 2: Call API with default filters
  const history =
    await api.functional.shoppingMall.seller.account_status_histories.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "change_date",
          order: "desc",
        } satisfies IShoppingMallSellerAccountStatusHistory.IRequest,
      },
    );
  // Step 3: Only validate response structure
  typia.assert(history);
}
