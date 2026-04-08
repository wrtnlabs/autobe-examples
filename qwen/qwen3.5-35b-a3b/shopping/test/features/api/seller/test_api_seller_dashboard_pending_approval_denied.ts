import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_pending_approval_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerData);
  // Seller must have pending approval status after join
  TestValidator.equals(
    "seller approval status",
    sellerData.approval_status,
    "pending",
  );
  // Create new connection with seller's JWT token for dashboard access attempt
  const dashboardConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerData.token.access,
    },
  };
  // Try to access seller dashboard with pending approval status
  // Should return 403 Forbidden error
  await TestValidator.httpError(
    "seller dashboard denied for pending approval",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.dashboard.at(
        dashboardConnection,
      );
    },
  );
}
