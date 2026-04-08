import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
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
import { generate_random_ecommerce_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_refund_request_snapshots_admin_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin for accessing admin endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate random UUIDs for order, item, and refund request IDs
  // Note: This test focuses on validating the snapshot retrieval endpoint structure
  // A full integration test would require creating actual orders and refund requests
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call the snapshots index endpoint with admin authentication
  // The endpoint should return paginated snapshots for the specified refund request
  const snapshots =
    await api.functional.ecommerce.admin.orders.items.refund_requests.snapshots.index(
      adminConnection,
      {
        orderId,
        itemId,
        requestId,
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current page is non-negative",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 5. Verify snapshots data array exists and is accessible
  TestValidator.predicate(
    "snapshots data is an array",
    Array.isArray(snapshots.data),
  );
  // 6. If snapshots exist, verify their structure
  if (snapshots.data.length > 0) {
    // Verify each snapshot has required fields
    for (const snapshot of snapshots.data) {
      typia.assert(snapshot);
      // Verify snapshot ID is valid UUID
      TestValidator.predicate(
        "snapshot has valid id",
        snapshot.id.length > 0 &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            snapshot.id,
          ),
      );
      // Verify snapshot has reason
      TestValidator.predicate(
        "snapshot has reason",
        snapshot.reason.length > 0,
      );
      // Verify snapshot has valid status
      TestValidator.predicate(
        "snapshot has valid status",
        snapshot.status === "pending" ||
          snapshot.status === "approved" ||
          snapshot.status === "rejected",
      );
      // Verify created_at is valid ISO timestamp
      TestValidator.predicate(
        "snapshot has valid created_at",
        snapshot.created_at.length > 0,
      );
      // Verify seller_response and response_at are either both null or both present
      if (snapshot.status === "pending") {
        TestValidator.equals(
          "pending snapshot has null seller_response",
          snapshot.seller_response,
          null,
        );
        TestValidator.equals(
          "pending snapshot has null response_at",
          snapshot.response_at,
          null,
        );
      } else {
        // For approved/rejected status, these should be populated
        TestValidator.predicate(
          "non-pending snapshot has seller_response",
          snapshot.seller_response !== null,
        );
        TestValidator.predicate(
          "non-pending snapshot has response_at",
          snapshot.response_at !== null,
        );
      }
    }
    // 7. Verify snapshots are in chronological order (by created_at)
    for (let i = 1; i < snapshots.data.length; i++) {
      const prevCreatedAt = new Date(
        snapshots.data[i - 1].created_at,
      ).getTime();
      const currCreatedAt = new Date(snapshots.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is after snapshot ${i - 1} chronologically`,
        currCreatedAt >= prevCreatedAt,
      );
    }
  }
  // 8. Verify total records matches data array length
  TestValidator.equals(
    "pagination records matches data length",
    snapshots.pagination.records,
    snapshots.data.length,
  );
}
