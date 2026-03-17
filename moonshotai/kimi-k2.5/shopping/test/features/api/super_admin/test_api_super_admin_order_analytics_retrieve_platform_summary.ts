import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_order_analytics_retrieve_platform_summary(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for super admin actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and authenticate as super administrator
  // The join endpoint automatically sets Authorization header on the connection
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
    },
  );
  // Step 2: Retrieve platform-wide order analytics
  // The endpoint returns aggregated metrics including total items, revenue, status breakdowns, and pending requests
  const analytics =
    await api.functional.ecommerceMall.superAdmin.orderAnalytics.aggregate(
      superAdminConnection,
      {
        body: typia.random<IEcommerceMallOrderAnalytic.IRequest>(),
      },
    );
  // Step 3: Validate response structure and constraints
  // Verifies all required fields: totalItems, totalRevenue, statusCounts (paid, shipped, delivered, cancelled, refunded),
  // pendingCancellationRequests, pendingRefundRequests
  typia.assert(analytics);
}
