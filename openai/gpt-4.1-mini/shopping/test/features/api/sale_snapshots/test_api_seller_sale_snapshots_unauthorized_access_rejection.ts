import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_snapshots_unauthorized_access_rejection(
  connection: api.IConnection,
): Promise<void> {
  // The test verifies that unauthenticated or unauthorized clients cannot access
  // the sale snapshots listing endpoint.
  // Create a new connection without any authentication headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Prepare an empty body as per IShoppingMallSaleSnapshot.IRequest
  const body: IShoppingMallSaleSnapshot.IRequest = {};
  // Attempt to retrieve sale snapshot data using unauthorized connection
  // Expect HTTP errors like 401 or 403
  await TestValidator.httpError(
    "should reject unauthenticated access with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.sale_snapshots.index(
        unauthorizedConnection,
        {
          body,
        },
      );
    },
  );
}
