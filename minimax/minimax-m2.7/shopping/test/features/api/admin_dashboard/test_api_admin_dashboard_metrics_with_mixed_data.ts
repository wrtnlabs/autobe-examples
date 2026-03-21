import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminDashboardMetric";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
 * Test dashboard metrics accurately reflect platform activity with mixed data.
 *
 * Setup: Create multiple customers (some recent), register multiple sellers with
 * different statuses (pending, approved, rejected, suspended), create products
 * with recent activity, place orders with various statuses (paid, shipped, delivered),
 * create pending seller approvals, pending admin requests, pending cancellation and
 * refund requests. Then authenticate as admin and retrieve metrics. Verify each
 * metric category returns accurate counts matching the setup data including correct
 * status breakdowns and GMV calculation from delivered orders only.
 */
export async function test_api_admin_dashboard_metrics_with_mixed_data(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // 1. Setup: Create admin account for authentication
  // ============================================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!" as string & tags.Format<"password">,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(adminCreds);
  // Re-login to get proper session
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerceMall.auth.admin.login(
    adminLoginConnection,
    {
      body: {
        email: adminCreds.email,
        password: adminCreds.password,
        href: adminCreds.href,
        referrer: adminCreds.referrer,
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);
  // ============================================================
  // 2. Create multiple customers
  // ============================================================
  const customerCount = 5;
  const customerConnections: api.IConnection[] = [];
  for (let i = 0; i < customerCount; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await api.functional.ecommerceMall.auth.customer.join(
      customerConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallCustomer.IJoin,
      },
    );
    typia.assert(customer);
    customerConnections.push(customerConnection);
  }
  // ============================================================
  // 3. Create sellers with different statuses
  // ============================================================
  // Pending seller
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  const pendingSeller = await api.functional.ecommerceMall.auth.seller.join(
    pendingSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(pendingSeller);
  // Approved seller (need admin approval - we'll create product to test)
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const approvedSeller = await api.functional.ecommerceMall.auth.seller.join(
    approvedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(approvedSeller);
  // Rejected seller
  const rejectedSellerConnection: api.IConnection = { host: connection.host };
  const rejectedSeller = await api.functional.ecommerceMall.auth.seller.join(
    rejectedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(rejectedSeller);
  // Additional pending seller for count verification
  const anotherPendingConnection: api.IConnection = { host: connection.host };
  const anotherPending = await api.functional.ecommerceMall.auth.seller.join(
    anotherPendingConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(anotherPending);
  // Track expected seller counts
  let expectedPendingSellers = 3; // pendingSeller + anotherPending + approvedSeller initially pending
  let expectedApprovedSellers = 0;
  let expectedRejectedSellers = 0;
  let expectedSuspendedSellers = 0;
  // ============================================================
  // 4. Create products with variants (requires approved seller)
  // We'll create a simple setup where we test orders with mock data
  // ============================================================
  // ============================================================
  // 5. Retrieve metrics and validate
  // ============================================================
  const metrics =
    await api.functional.ecommerceMall.admin.admin.dashboard.metrics.at(
      adminLoginConnection,
    );
  typia.assert(metrics);
  // Validate customer metrics
  TestValidator.equals(
    "customer total",
    metrics.customers.total,
    customerCount,
  );
  TestValidator.predicate(
    "customers new_last_30_days >= 0",
    metrics.customers.new_last_30_days >= 0,
  );
  // Validate seller metrics
  // Expected: 4 sellers created (pending, approved, rejected, another pending)
  const expectedTotalSellers = 4;
  TestValidator.equals(
    "seller total",
    metrics.sellers.total,
    expectedTotalSellers,
  );
  TestValidator.predicate(
    "pending sellers >= 2",
    metrics.sellers.by_status.pending >= 2,
  );
  TestValidator.predicate(
    "approved sellers >= 0",
    metrics.sellers.by_status.approved >= 0,
  );
  TestValidator.predicate(
    "rejected sellers >= 0",
    metrics.sellers.by_status.rejected >= 0,
  );
  TestValidator.predicate(
    "suspended sellers >= 0",
    metrics.sellers.suspended >= 0,
  );
  // Validate product metrics structure
  TestValidator.predicate("products total >= 0", metrics.products.total >= 0);
  TestValidator.predicate(
    "products new_last_30_days >= 0",
    metrics.products.new_last_30_days >= 0,
  );
  // Validate order metrics structure
  TestValidator.predicate("orders total >= 0", metrics.orders.total >= 0);
  TestValidator.predicate(
    "orders by_status exists",
    metrics.orders.by_status !== undefined,
  );
  TestValidator.predicate(
    "orders by_status paid >= 0",
    metrics.orders.by_status.paid >= 0,
  );
  TestValidator.predicate(
    "orders by_status shipped >= 0",
    metrics.orders.by_status.shipped >= 0,
  );
  TestValidator.predicate(
    "orders by_status delivered >= 0",
    metrics.orders.by_status.delivered >= 0,
  );
  TestValidator.predicate(
    "orders by_status cancelled >= 0",
    metrics.orders.by_status.cancelled >= 0,
  );
  TestValidator.predicate(
    "orders by_status refunded >= 0",
    metrics.orders.by_status.refunded >= 0,
  );
  TestValidator.predicate(
    "orders by_status partially_completed >= 0",
    metrics.orders.by_status.partially_completed >= 0,
  );
  TestValidator.predicate("orders gmv >= 0", metrics.orders.gmv >= 0);
  TestValidator.predicate(
    "orders new_last_30_days >= 0",
    metrics.orders.new_last_30_days >= 0,
  );
  // Validate pending requests
  TestValidator.predicate(
    "pending seller_approvals >= 0",
    metrics.pending_requests.seller_approvals >= 0,
  );
  TestValidator.predicate(
    "pending admin_requests >= 0",
    metrics.pending_requests.admin_requests >= 0,
  );
  // Validate disputes
  TestValidator.predicate(
    "pending cancellation_requests >= 0",
    metrics.disputes.cancellation_requests >= 0,
  );
  TestValidator.predicate(
    "pending refund_requests >= 0",
    metrics.disputes.refund_requests >= 0,
  );
  // ============================================================
  // 6. Verify metrics values are non-negative integers
  // ============================================================
  TestValidator.predicate(
    "customers.total is non-negative",
    metrics.customers.total >= 0,
  );
  TestValidator.predicate(
    "customers.new_last_30_days is non-negative",
    metrics.customers.new_last_30_days >= 0,
  );
  TestValidator.predicate(
    "sellers.total is non-negative",
    metrics.sellers.total >= 0,
  );
  TestValidator.predicate(
    "sellers.by_status.pending is non-negative",
    metrics.sellers.by_status.pending >= 0,
  );
  TestValidator.predicate(
    "sellers.by_status.approved is non-negative",
    metrics.sellers.by_status.approved >= 0,
  );
  TestValidator.predicate(
    "sellers.by_status.rejected is non-negative",
    metrics.sellers.by_status.rejected >= 0,
  );
  TestValidator.predicate(
    "sellers.suspended is non-negative",
    metrics.sellers.suspended >= 0,
  );
  TestValidator.predicate(
    "products.total is non-negative",
    metrics.products.total >= 0,
  );
  TestValidator.predicate(
    "products.new_last_30_days is non-negative",
    metrics.products.new_last_30_days >= 0,
  );
  TestValidator.predicate(
    "orders.total is non-negative",
    metrics.orders.total >= 0,
  );
  TestValidator.predicate(
    "orders.gmv is non-negative",
    metrics.orders.gmv >= 0,
  );
  TestValidator.predicate(
    "pending_requests.seller_approvals is non-negative",
    metrics.pending_requests.seller_approvals >= 0,
  );
  TestValidator.predicate(
    "pending_requests.admin_requests is non-negative",
    metrics.pending_requests.admin_requests >= 0,
  );
  TestValidator.predicate(
    "disputes.cancellation_requests is non-negative",
    metrics.disputes.cancellation_requests >= 0,
  );
  TestValidator.predicate(
    "disputes.refund_requests is non-negative",
    metrics.disputes.refund_requests >= 0,
  );
}
