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

/**
 * Test seller refund request statistics aggregation by status.
 *
 * Validates that the statistics endpoint correctly returns counts
 * broken down by refund request status (pending, approved, rejected),
 * and that the total equals the sum of all status counts.
 */
export async function test_api_refund_request_statistics_status_breakdown(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Get refund request statistics for the seller
  const statistics =
    await api.functional.shoppingMall.seller.refund_request_statistics.statistics(
      sellerConnection,
    );
  typia.assert(statistics);
  // 3. Validate business rule: total must equal sum of status counts
  TestValidator.equals(
    "total equals sum of pending, approved, and rejected counts",
    statistics.total,
    statistics.pending + statistics.approved + statistics.rejected,
  );
}
