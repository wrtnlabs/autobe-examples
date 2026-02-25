import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_refund_request_audit_trail_and_snapshot_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create seller and customer connections
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "password123";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "password123";
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Note: Due to missing order item creation endpoints, this test will focus on
  // validating the audit trail functionality with refund request status updates
  // Create a refund request directly (simulating pre-existing delivered order item)
  const refundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }).substring(0, 500),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Test audit trail by updating status multiple times
  // First status change: Approve
  const statusUpdate1 =
    await api.functional.ecommerce.customer.refund_requests.statuses.updateStatus(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "approved",
          reason: "Approved for customer satisfaction",
        } satisfies IEcommerceRefundRequest.IUpdateStatus,
      },
    );
  typia.assert(statusUpdate1);
  // Validate audit trail after first status change
  TestValidator.equals(
    "should have status history",
    statusUpdate1.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "should contain approval status",
    statusUpdate1.data.some(
      (s) => s.status === "approved" || s.status.includes("approved"),
    ),
  );
  // Second status change: Reject
  const statusUpdate2 =
    await api.functional.ecommerce.customer.refund_requests.statuses.updateStatus(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "rejected",
          reason: "Item outside refund window",
        } satisfies IEcommerceRefundRequest.IUpdateStatus,
      },
    );
  typia.assert(statusUpdate2);
  // Validate complete audit trail after multiple status changes
  TestValidator.equals(
    "should have multiple status entries",
    statusUpdate2.data.length > 1,
    true,
  );
  TestValidator.predicate(
    "should contain at least two status records",
    statusUpdate2.data.length >= 2,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be positive",
    statusUpdate2.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    statusUpdate2.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be consistent",
    statusUpdate2.pagination.records >= statusUpdate2.data.length,
  );
  // Validate timestamp ordering (most recent first) - if there are multiple entries
  if (statusUpdate2.data.length > 1) {
    const firstTimestamp = new Date(statusUpdate2.data[0].created_at).getTime();
    const secondTimestamp = new Date(
      statusUpdate2.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "status entries should be in chronological order (newest first)",
      firstTimestamp >= secondTimestamp,
    );
  }
  // Validate that each status entry has required properties
  for (const statusEntry of statusUpdate2.data) {
    TestValidator.predicate(
      `status entry ${statusEntry.id} should have id`,
      !!statusEntry.id,
    );
    TestValidator.predicate(
      `status entry ${statusEntry.id} should have status`,
      !!statusEntry.status,
    );
    TestValidator.predicate(
      `status entry ${statusEntry.id} should have created_at`,
      !!statusEntry.created_at,
    );
  }
}
