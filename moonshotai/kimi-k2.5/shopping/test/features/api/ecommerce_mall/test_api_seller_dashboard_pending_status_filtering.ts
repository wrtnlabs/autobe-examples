import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_pending_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  // 2. Access seller dashboard
  const dashboard =
    await api.functional.ecommerceMall.seller.dashboard.at(sellerConnection);
  // 3. Validate complete response structure and types (includes Type<int32> validation)
  typia.assert(dashboard);
  // 4. Business logic validation: pending counts represent item counts, must be non-negative
  TestValidator.predicate(
    "pending cancellation requests count must be non-negative",
    dashboard.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pending refund requests count must be non-negative",
    dashboard.pendingRefundRequests >= 0,
  );
}
