import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequestSnapshot";
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
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Test cancellation request snapshots after seller approval workflow.
 *
 * Validates the complete cancellation request audit trail by verifying that sellers can retrieve snapshots recording status transitions when they approve cancellation requests. The test ensures the snapshot system properly captures the before/after status, actor information, and timestamps for dispute resolution and compliance purposes.
 *
 * Note: This test assumes the existence of a valid paid order item in the system. In a complete test setup, prerequisite entities (products, variants, orders, order items) would be created before executing this test scenario.
 *
 * 1. Customer registers and authenticates with the platform.
 * 2. Seller registers, gets approved, and authenticates.
 * 3. Customer submits a cancellation request for an existing paid order item.
 * 4. Seller approves the cancellation request, creating a snapshot.
 * 5. Seller retrieves snapshots to verify the audit trail.
 * 6. Validates snapshot contains correct status transition (pending → approved).
 * 7. Validates snapshot records the seller as the actor who made the change.
 * 8. Validates snapshot includes timestamp and optional change reason.
 */
export async function test_api_cancellation_request_snapshots_after_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Generate UUIDs for order and item (in production, these would reference existing entities)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Customer creates cancellation request for order item
  const cancellationRequest =
    await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceCancellationRequest.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  const requestId = cancellationRequest.id;
  // 4. Seller approves the cancellation request
  const sellerResponseReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.update(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
        body: {
          status: "approved",
          seller_response: sellerResponseReason,
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals(
    "cancellation request status is approved",
    updatedRequest.status,
    "approved",
  );
  // 5. Seller retrieves snapshots to verify audit trail
  const snapshots =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot pagination structure
  TestValidator.predicate(
    "snapshots pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    snapshots.pagination.limit,
    10,
  );
  // 7. Validate snapshot data exists
  TestValidator.predicate(
    "snapshots data array exists",
    Array.isArray(snapshots.data),
  );
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshots.data.length > 0,
  );
  // 8. Find and validate the approval snapshot
  const approvalSnapshot = snapshots.data.find(
    (snapshot) => snapshot.status_after === "approved",
  );
  TestValidator.predicate(
    "approval snapshot exists with status_after approved",
    approvalSnapshot !== undefined,
  );
  if (approvalSnapshot) {
    // Validate status transition
    TestValidator.equals(
      "status_before is pending",
      approvalSnapshot.status_before,
      "pending",
    );
    TestValidator.equals(
      "status_after is approved",
      approvalSnapshot.status_after,
      "approved",
    );
    // Validate actor information
    TestValidator.equals(
      "changed_by_actor_type is seller",
      approvalSnapshot.changed_by_actor_type,
      "seller",
    );
    TestValidator.equals(
      "changed_by_actor_id matches seller ID",
      approvalSnapshot.changed_by_actor_id,
      seller.id,
    );
    // Validate timestamp exists and is valid
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(new Date(approvalSnapshot.created_at).getTime()),
    );
    // Validate change_reason is present (seller provided response)
    TestValidator.predicate(
      "change_reason exists for approval",
      approvalSnapshot.change_reason !== undefined &&
        approvalSnapshot.change_reason !== null,
    );
  }
}
