import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_access_by_authenticated_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with valid email and password
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Create authenticated seller connection using the token from registration
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Authenticated seller accesses dashboard
  const dashboard =
    await api.functional.ecommerceMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 4. Validate dashboard response structure and metric fields
  TestValidator.predicate(
    "totalProducts is non-negative integer",
    dashboard.totalProducts >= 0,
  );
  TestValidator.predicate(
    "totalOrderItems is non-negative integer",
    dashboard.totalOrderItems >= 0,
  );
  TestValidator.predicate(
    "pendingCancellationRequests is non-negative integer",
    dashboard.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pendingRefundRequests is non-negative integer",
    dashboard.pendingRefundRequests >= 0,
  );
}
