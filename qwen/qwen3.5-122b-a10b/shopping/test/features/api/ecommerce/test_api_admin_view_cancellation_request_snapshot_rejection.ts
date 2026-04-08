import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
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
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Test administrator viewing cancellation request snapshot for rejection.
 *
 * Validates that administrators can audit rejected cancellation requests by viewing snapshots that capture the status transition from pending to rejected, including the seller's rejection reason. This is critical for dispute resolution and customer support scenarios where administrators need to understand why sellers denied cancellation requests.
 *
 * The test creates a complete cancellation workflow involving three actors: customer who requests cancellation, seller who rejects it, and administrator who audits the snapshot. It verifies that the snapshot system correctly records all transition details including actor identity and change rationale.
 *
 * 1. Administrator registers and authenticates to access admin-only snapshot endpoints.
 * 2. Customer registers and authenticates to create cancellation requests.
 * 3. Customer creates a cancellation request for a paid order item with a reason.
 * 4. Seller registers and authenticates to respond to cancellation requests.
 * 5. Seller rejects the cancellation request with a rejection reason.
 * 6. Administrator retrieves the cancellation request snapshot.
 * 7. Validates snapshot contains correct status transition (pending → rejected).
 * 8. Validates snapshot contains seller's actor ID and type.
 * 9. Validates snapshot contains the rejection reason provided by seller.
 */
export async function test_api_admin_view_cancellation_request_snapshot_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Customer authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Create cancellation request
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.create(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Seller authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 5. Seller rejects the cancellation request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
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
  // 6. Admin retrieves the cancellation request snapshot
  // Note: We need to get the snapshot ID from somewhere - in real scenario,
  // we would list snapshots first. For this test, we'll use the request ID
  // as a proxy, but in production this would be a separate snapshot listing endpoint.
  // Since we don't have that endpoint available, we'll use the requestId as snapshotId
  // This is a limitation of the available SDK functions.
  const snapshot =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.snapshots.at(
      adminConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        snapshotId: cancellationRequest.id,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot contains correct status transition
  TestValidator.equals(
    "status before should be pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "status after should be rejected",
    snapshot.statusAfter,
    "rejected",
  );
  // 8. Validate snapshot contains seller's actor information
  TestValidator.equals(
    "changed by actor type should be seller",
    snapshot.changedByActorType,
    "seller",
  );
  TestValidator.predicate(
    "changed by actor ID should match seller",
    snapshot.changedByActorId === seller.id,
  );
  // 9. Validate snapshot contains rejection reason
  TestValidator.predicate(
    "change reason should not be null",
    snapshot.changeReason !== null,
  );
  TestValidator.equals(
    "change reason should match rejection reason",
    snapshot.changeReason,
    rejectionReason,
  );
}
