import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call analytics overview endpoint
  const analytics =
    await api.functional.ecommerceMall.admin.analytics.overview(
      adminConnection,
    );
  typia.assert(analytics);
  // 3. Validate business logic: status breakdown sums match totals
  TestValidator.equals(
    "customers by status sum equals total customers",
    analytics.customersByStatus.active +
      analytics.customersByStatus.suspended +
      analytics.customersByStatus.banned,
    analytics.customers,
  );
  TestValidator.equals(
    "sellers by approval status sum equals total sellers",
    analytics.sellersByApprovalStatus.pending +
      analytics.sellersByApprovalStatus.approved +
      analytics.sellersByApprovalStatus.rejected,
    analytics.sellers,
  );
  TestValidator.equals(
    "sellers by account status sum equals total sellers",
    analytics.sellersByAccountStatus.active +
      analytics.sellersByAccountStatus.suspended +
      analytics.sellersByAccountStatus.banned,
    analytics.sellers,
  );
  TestValidator.equals(
    "products by status sum equals total products",
    analytics.productsByStatus.active +
      analytics.productsByStatus.deleted +
      analytics.productsByStatus.suspended,
    analytics.products,
  );
  TestValidator.equals(
    "orders by status sum equals total orders",
    analytics.ordersByStatus.paid +
      analytics.ordersByStatus.shipped +
      analytics.ordersByStatus.delivered +
      analytics.ordersByStatus.cancelled +
      analytics.ordersByStatus.refunded +
      analytics.ordersByStatus.partiallyCompleted,
    analytics.orders,
  );
}