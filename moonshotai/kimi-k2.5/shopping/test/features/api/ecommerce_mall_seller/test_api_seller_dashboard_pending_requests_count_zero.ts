import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPendingRequestsCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPendingRequestsCount";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_dashboard_pending_requests_count_zero(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register a new seller with no operational history
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Retrieve pending requests count for the new seller
  const pendingCount =
    await api.functional.ecommerceMall.seller.pending_requests_count.pendingRequestsCount(
      sellerConnection,
    );
  typia.assert(pendingCount);
  // 4. Validate count is zero for new seller
  TestValidator.equals(
    "pending requests count for new seller",
    pendingCount.count,
    0,
  );
}
