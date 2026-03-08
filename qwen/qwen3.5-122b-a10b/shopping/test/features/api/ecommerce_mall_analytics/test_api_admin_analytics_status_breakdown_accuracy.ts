import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAnalytic";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test admin analytics status breakdown accuracy.
 *
 * Verify that analytics endpoint returns accurate status breakdown counts for all entity types.
 * Since CRUD APIs for creating customers, sellers, products, orders with specific statuses are
 * not available in the provided SDK, this test validates:
 * 1) Response structure conforms to IEcommerceMallAnalytic type
 * 2) All count fields are non-negative integers
 * 3) All status breakdown objects contain expected keys
 * 4) Total counts match sum of their respective status breakdowns
 */
export async function test_api_admin_analytics_status_breakdown_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call analytics endpoint
  const analytics =
    await api.functional.ecommerceMall.admin.analytics.overview(
      adminConnection,
    );
  typia.assert(analytics);
  // 3. Validate customer counts
  TestValidator.equals(
    "customer total matches sum of status breakdown",
    analytics.customers,
    analytics.customersByStatus.active +
      analytics.customersByStatus.suspended +
      analytics.customersByStatus.banned,
  );
  // 4. Validate seller counts
  TestValidator.equals(
    "seller total matches sum of approval status breakdown",
    analytics.sellers,
    analytics.sellersByApprovalStatus.pending +
      analytics.sellersByApprovalStatus.approved +
      analytics.sellersByApprovalStatus.rejected,
  );
  TestValidator.equals(
    "seller total matches sum of account status breakdown",
    analytics.sellers,
    analytics.sellersByAccountStatus.active +
      analytics.sellersByAccountStatus.suspended +
      analytics.sellersByAccountStatus.banned,
  );
  // 5. Validate product counts
  TestValidator.equals(
    "product total matches sum of status breakdown",
    analytics.products,
    analytics.productsByStatus.active +
      analytics.productsByStatus.deleted +
      analytics.productsByStatus.suspended,
  );
  // 6. Validate order counts
  TestValidator.equals(
    "order total matches sum of status breakdown",
    analytics.orders,
    analytics.ordersByStatus.paid +
      analytics.ordersByStatus.shipped +
      analytics.ordersByStatus.delivered +
      analytics.ordersByStatus.cancelled +
      analytics.ordersByStatus.refunded +
      analytics.ordersByStatus.partiallyCompleted,
  );
  // 7. Validate all counts are non-negative
  TestValidator.predicate(
    "customers count non-negative",
    analytics.customers >= 0,
  );
  TestValidator.predicate("sellers count non-negative", analytics.sellers >= 0);
  TestValidator.predicate(
    "products count non-negative",
    analytics.products >= 0,
  );
  TestValidator.predicate("orders count non-negative", analytics.orders >= 0);
  TestValidator.predicate(
    "order items count non-negative",
    analytics.orderItems >= 0,
  );
  TestValidator.predicate(
    "pending cancellation requests non-negative",
    analytics.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pending refund requests non-negative",
    analytics.pendingRefundRequests >= 0,
  );
}
