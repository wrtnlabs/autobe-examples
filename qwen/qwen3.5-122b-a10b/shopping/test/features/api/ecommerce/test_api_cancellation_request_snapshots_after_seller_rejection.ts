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
 * Test cancellation request snapshots after seller rejection.
 *
 * Validates that when a seller rejects a customer's cancellation request with a reason, the system properly creates and preserves audit trail snapshots. The test verifies the complete rejection workflow including status transition recording, actor identification, and change reason preservation.
 *
 * The scenario ensures that rejection reasons are captured in the snapshot for customer transparency and dispute resolution purposes. It validates that the snapshot contains all required fields including status_before, status_after, changed_by_actor_id, changed_by_actor_type, change_reason, and created_at timestamp.
 *
 * 1. Customer registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Customer creates cancellation request for an order item.
 * 4. Seller rejects the cancellation request with a reason.
 * 5. Seller retrieves snapshots for the cancellation request.
 * 6. Validates snapshot contains status transition from 'pending' to 'rejected'.
 * 7. Validates snapshot contains seller's change_reason.
 * 8. Validates snapshot contains correct actor information.
 * 9. Validates snapshot timestamp is properly recorded.
 */
export async function test_api_cancellation_request_snapshots_after_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Generate random UUIDs for order, item, and cancellation request
  // Note: In a real scenario, we would create an actual order and item first
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Customer creates cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.create(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          reason: cancellationReason,
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status",
    cancellationRequest.status,
    "pending",
  );
  // 5. Seller rejects the cancellation request with a reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.update(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {
          status: "rejected",
          seller_response: rejectionReason,
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals(
    "cancellation request status after rejection",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "seller response populated",
    updatedRequest.sellerResponse,
    rejectionReason,
  );
  // 6. Seller retrieves snapshots for the cancellation request
  const snapshots =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshots exist
  TestValidator.predicate("snapshots exist", snapshots.data.length > 0);
  // 8. Find the rejection snapshot (status_after = 'rejected')
  const rejectionSnapshot = snapshots.data.find(
    (snapshot) => snapshot.status_after === "rejected",
  );
  TestValidator.predicate(
    "rejection snapshot exists",
    rejectionSnapshot !== undefined,
  );
  if (rejectionSnapshot) {
    // 9. Validate status transition
    TestValidator.equals(
      "status_before is pending",
      rejectionSnapshot.status_before,
      "pending",
    );
    TestValidator.equals(
      "status_after is rejected",
      rejectionSnapshot.status_after,
      "rejected",
    );
    // 10. Validate actor information
    TestValidator.equals(
      "changed_by_actor_type is seller",
      rejectionSnapshot.changed_by_actor_type,
      "seller",
    );
    TestValidator.equals(
      "changed_by_actor_id matches seller",
      rejectionSnapshot.changed_by_actor_id,
      sellerAuth.id,
    );
    // 11. Validate change_reason is populated
    TestValidator.predicate(
      "change_reason is populated",
      rejectionSnapshot.change_reason !== null &&
        rejectionSnapshot.change_reason !== undefined,
    );
    TestValidator.equals(
      "change_reason matches rejection reason",
      rejectionSnapshot.change_reason,
      rejectionReason,
    );
    // 12. Validate timestamp exists
    TestValidator.predicate(
      "created_at is valid timestamp",
      new Date(rejectionSnapshot.created_at).getTime() > 0,
    );
  }
}
