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
 * Validates the audit trail snapshot system when a seller rejects a customer's cancellation request. Ensures that the snapshot correctly records the status transition from 'pending' to 'rejected', including the seller's actor information and rejection reason.
 *
 * **Important Note**: This test requires pre-existing order data with a paid order item. The test infrastructure should provide fixture data or the test may fail if no valid order exists. In production testing, ensure order creation utilities are available or use seeded test data.
 *
 * 1. Customer registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Customer creates cancellation request for an order item (requires valid orderId and itemId with 'paid' status).
 * 4. Seller rejects the cancellation request with a reason.
 * 5. Customer retrieves cancellation request snapshots.
 * 6. Validates snapshot contains status_before='pending', status_after='rejected', seller's actor ID, actor type='seller', and rejection reason.
 */
export async function test_api_cancellation_request_snapshots_after_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Register and authenticate seller
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
  // Note: This test requires pre-existing order data with paid order item
  // For demonstration, using random UUIDs - in real test, use fixture data or order creation utilities
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Customer creates cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationRequest =
    await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: cancellationReason,
        } satisfies IEcommerceCancellationRequest.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Seller rejects the cancellation request
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
  TestValidator.equals("status is rejected", updatedRequest.status, "rejected");
  TestValidator.equals(
    "seller response is set",
    updatedRequest.sellerResponse,
    rejectionReason,
  );
  // 5. Customer retrieves snapshots
  const snapshots =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot audit trail
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshots.data.length > 0,
  );
  const rejectionSnapshot = snapshots.data.find(
    (s) => s.status_after === "rejected",
  );
  TestValidator.predicate(
    "snapshot with rejected status exists",
    rejectionSnapshot !== undefined,
  );
  if (rejectionSnapshot) {
    typia.assertGuard(rejectionSnapshot);
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
    TestValidator.equals(
      "changed_by_actor_id matches seller",
      rejectionSnapshot.changed_by_actor_id,
      seller.id,
    );
    TestValidator.equals(
      "changed_by_actor_type is seller",
      rejectionSnapshot.changed_by_actor_type,
      "seller",
    );
    TestValidator.equals(
      "change_reason matches rejection reason",
      rejectionSnapshot.change_reason,
      rejectionReason,
    );
    TestValidator.predicate(
      "created_at is valid timestamp",
      rejectionSnapshot.created_at.length > 0,
    );
  }
}
