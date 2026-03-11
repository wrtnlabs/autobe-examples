import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallObservabilityDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallObservabilityDashboard";
import type { IEcommerceMallObservabilityDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallObservabilityDashboardSummary";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_admin_observability_dashboard_data_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: "SecurePassword123!",
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
    },
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: "SecurePassword123!",
    },
  });
  // 2. Register and login seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: "SecurePassword123!",
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string,
    },
  });
  typia.assert(seller);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: "SecurePassword123!",
    },
  });
  // 3. Create products with various configurations
  const category = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Test Category",
    isLeaf: true,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  } satisfies IEcommerceMallCategory.ISummary;
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product Alpha",
        description: "First test product for dashboard validation",
        base_price: 10000,
        category_id: category.id,
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product Beta",
        description: "Second test product for dashboard validation",
        base_price: 20000,
        category_id: category.id,
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 4. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: "SecurePassword123!",
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
    },
  });
  typia.assert(customer);
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "SecurePassword123!",
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
    },
  });
  // 5. Call observability dashboard
  const dashboard =
    await api.functional.ecommerceMall.admin.observability.dashboard.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // 6. Validate inventory alerts structure (note: DTO defines as singular, not array)
  TestValidator.equals(
    "inventory alerts has variantId",
    typeof dashboard.inventoryAlerts.variantId,
    "string",
  );
  TestValidator.equals(
    "inventory alerts has productName",
    typeof dashboard.inventoryAlerts.productName,
    "string",
  );
  TestValidator.equals(
    "inventory alerts has stockQuantity",
    typeof dashboard.inventoryAlerts.stockQuantity,
    "number",
  );
  TestValidator.equals(
    "inventory alerts has variantStatus",
    typeof dashboard.inventoryAlerts.variantStatus,
    "string",
  );
  // 7. Validate review analytics structure
  TestValidator.equals(
    "totalReviews is number",
    typeof dashboard.reviewAnalytics.totalReviews,
    "number",
  );
  TestValidator.predicate(
    "averageRating is number or null",
    dashboard.reviewAnalytics.averageRating === null ||
      typeof dashboard.reviewAnalytics.averageRating === "number",
  );
  TestValidator.equals(
    "pendingModerationCount is number",
    typeof dashboard.reviewAnalytics.pendingModerationCount,
    "number",
  );
  // 8. Validate seller metrics
  TestValidator.equals(
    "productCount is number",
    typeof dashboard.sellerMetrics.productCount,
    "number",
  );
  TestValidator.equals(
    "orderItemCount is number",
    typeof dashboard.sellerMetrics.orderItemCount,
    "number",
  );
  // 9. Validate audit metrics
  TestValidator.equals(
    "totalCount is number",
    typeof dashboard.auditMetrics.totalCount,
    "number",
  );
  // 10. Validate order status breakdown structure
  TestValidator.equals(
    "paid_count is number",
    typeof dashboard.orderStatusBreakdown.paid_count,
    "number",
  );
  TestValidator.equals(
    "shipped_count is number",
    typeof dashboard.orderStatusBreakdown.shipped_count,
    "number",
  );
  TestValidator.equals(
    "delivered_count is number",
    typeof dashboard.orderStatusBreakdown.delivered_count,
    "number",
  );
  TestValidator.equals(
    "cancelled_count is number",
    typeof dashboard.orderStatusBreakdown.cancelled_count,
    "number",
  );
  TestValidator.equals(
    "refunded_count is number",
    typeof dashboard.orderStatusBreakdown.refunded_count,
    "number",
  );
  // 11. Validate seller approval structure
  TestValidator.equals(
    "pendingCount is number",
    typeof dashboard.sellerApproval.pendingCount,
    "number",
  );
  TestValidator.predicate(
    "averageWaitTime is number or null",
    dashboard.sellerApproval.averageWaitTime === null ||
      typeof dashboard.sellerApproval.averageWaitTime === "number",
  );
  TestValidator.equals(
    "oldestRequests is array",
    Array.isArray(dashboard.sellerApproval.oldestRequests),
    true,
  );
  // 12. Validate system status structure
  TestValidator.equals(
    "apiHealth is string",
    typeof dashboard.systemStatus.apiHealth,
    "string",
  );
  TestValidator.equals(
    "apiLatencyMs is number",
    typeof dashboard.systemStatus.apiLatencyMs,
    "number",
  );
  TestValidator.equals(
    "databaseConnectionPoolUtilization is number",
    typeof dashboard.systemStatus.databaseConnectionPoolUtilization,
    "number",
  );
  TestValidator.equals(
    "paymentProcessingSuccessRate is number",
    typeof dashboard.systemStatus.paymentProcessingSuccessRate,
    "number",
  );
  TestValidator.equals(
    "cacheHitRate is number",
    typeof dashboard.systemStatus.cacheHitRate,
    "number",
  );
  TestValidator.equals(
    "errorRate is number",
    typeof dashboard.systemStatus.errorRate,
    "number",
  );
  TestValidator.equals(
    "activeConnections is number",
    typeof dashboard.systemStatus.activeConnections,
    "number",
  );
  TestValidator.equals(
    "isOperational is boolean",
    typeof dashboard.systemStatus.isOperational,
    "boolean",
  );
}
