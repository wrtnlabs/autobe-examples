import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallRefundRequestStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestStatistic";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_statistics_new_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Get refund request statistics for the new seller
  const statistics: IShoppingMallRefundRequestStatistic =
    await api.functional.shoppingMall.seller.refund_request_statistics.statistics(
      sellerConnection,
    );
  typia.assert(statistics);
  // 3. Validate all values are zero for a new seller with no history
  TestValidator.equals("total should be zero", statistics.total, 0);
  TestValidator.equals("pending should be zero", statistics.pending, 0);
  TestValidator.equals("approved should be zero", statistics.approved, 0);
  TestValidator.equals("rejected should be zero", statistics.rejected, 0);
}
