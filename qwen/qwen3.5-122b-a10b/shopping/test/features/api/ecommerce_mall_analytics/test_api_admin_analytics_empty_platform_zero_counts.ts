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

export async function test_api_admin_analytics_empty_platform_zero_counts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call analytics overview endpoint (platform should be empty)
  const analytics =
    await api.functional.ecommerceMall.admin.analytics.overview(
      adminConnection,
    );
  typia.assert(analytics);
  // 3. Validate all total counts are zero
  TestValidator.equals("total customers count", analytics.customers, 0);
  TestValidator.equals("total sellers count", analytics.sellers, 0);
  TestValidator.equals("total products count", analytics.products, 0);
  TestValidator.equals("total orders count", analytics.orders, 0);
  TestValidator.equals("total order items count", analytics.orderItems, 0);
  TestValidator.equals(
    "pending cancellation requests",
    analytics.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pending refund requests",
    analytics.pendingRefundRequests,
    0,
  );
  // 4. Validate customer status breakdowns are all zero
  TestValidator.equals(
    "customers by status - active",
    analytics.customersByStatus.active,
    0,
  );
  TestValidator.equals(
    "customers by status - suspended",
    analytics.customersByStatus.suspended,
    0,
  );
  TestValidator.equals(
    "customers by status - banned",
    analytics.customersByStatus.banned,
    0,
  );
  // 5. Validate seller approval status breakdowns are all zero
  TestValidator.equals(
    "sellers by approval status - pending",
    analytics.sellersByApprovalStatus.pending,
    0,
  );
  TestValidator.equals(
    "sellers by approval status - approved",
    analytics.sellersByApprovalStatus.approved,
    0,
  );
  TestValidator.equals(
    "sellers by approval status - rejected",
    analytics.sellersByApprovalStatus.rejected,
    0,
  );
  // 6. Validate seller account status breakdowns are all zero
  TestValidator.equals(
    "sellers by account status - active",
    analytics.sellersByAccountStatus.active,
    0,
  );
  TestValidator.equals(
    "sellers by account status - suspended",
    analytics.sellersByAccountStatus.suspended,
    0,
  );
  TestValidator.equals(
    "sellers by account status - banned",
    analytics.sellersByAccountStatus.banned,
    0,
  );
  // 7. Validate product status breakdowns are all zero
  TestValidator.equals(
    "products by status - active",
    analytics.productsByStatus.active,
    0,
  );
  TestValidator.equals(
    "products by status - deleted",
    analytics.productsByStatus.deleted,
    0,
  );
  TestValidator.equals(
    "products by status - suspended",
    analytics.productsByStatus.suspended,
    0,
  );
  // 8. Validate order status breakdowns are all zero
  TestValidator.equals(
    "orders by status - paid",
    analytics.ordersByStatus.paid,
    0,
  );
  TestValidator.equals(
    "orders by status - shipped",
    analytics.ordersByStatus.shipped,
    0,
  );
  TestValidator.equals(
    "orders by status - delivered",
    analytics.ordersByStatus.delivered,
    0,
  );
  TestValidator.equals(
    "orders by status - cancelled",
    analytics.ordersByStatus.cancelled,
    0,
  );
  TestValidator.equals(
    "orders by status - refunded",
    analytics.ordersByStatus.refunded,
    0,
  );
  TestValidator.equals(
    "orders by status - partially completed",
    analytics.ordersByStatus.partiallyCompleted,
    0,
  );
}