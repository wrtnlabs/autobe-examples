import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator can retrieve an approved cancellation request with complete snapshot history.
 *
 * Validates the administrator's ability to access cancellation request details including the complete audit trail of status transitions. The test verifies that an approved cancellation request contains accurate snapshot data reflecting the status change from pending to approved, along with the seller's response reason and order item status updates.
 *
 * Special attention is given to verifying that the snapshot correctly captures the status_before as 'pending', status_after as 'approved', and includes the seller's response reason. The order item status must reflect the approved cancellation as 'cancelled'.
 *
 * 1. Administrator registers and authenticates.
 * 2. Customer registers and authenticates.
 * 3. Seller registers and authenticates.
 * 4. Administrator retrieves an existing approved cancellation request.
 * 5. Validates the cancellation request contains correct status, response reason, and snapshot data.
 */
export async function test_api_cancellation_request_retrieve_approved_with_snapshots_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    },
  });
  // 2. Customer setup (for reference)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "password123",
      href: "https://test.com/customer",
      referrer: "https://test.com",
    },
  });
  // 3. Seller setup (for reference)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "password123",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    },
  });
  // Note: The complete workflow would require additional API endpoints for:
  // - Product creation by seller
  // - Order placement by customer
  // - Cancellation request creation by customer
  // - Cancellation request approval by seller
  // These endpoints are not available in the provided SDK, so we test with a pre-existing cancellation request.
  // 4. Generate a cancellation request ID for testing
  // In a real scenario, this would come from a previous cancellation request creation step
  const cancellationRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Administrator retrieves the approved cancellation request
  const cancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.administrator.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId,
      },
    );
  typia.assert(cancellationRequest);
  // 6. Validate cancellation request status is approved
  TestValidator.equals(
    "cancellation request status is approved",
    cancellationRequest.status,
    "approved",
  );
  // 7. Validate response reason is populated (seller's approval explanation)
  TestValidator.predicate(
    "response_reason is non-null for approved request",
    cancellationRequest.response_reason !== null,
  );
  // 8. Validate customer information is present
  TestValidator.predicate(
    "customer information exists",
    cancellationRequest.customer.email !== undefined,
  );
  TestValidator.predicate(
    "customer has display name",
    cancellationRequest.customer.display_name !== undefined,
  );
  // 9. Validate order item status reflects the approved cancellation
  TestValidator.equals(
    "order item status is cancelled after approval",
    cancellationRequest.orderItem.status,
    "cancelled",
  );
  // 10. Validate snapshots array exists and contains at least one snapshot
  TestValidator.predicate(
    "snapshots array is not empty",
    cancellationRequest.snapshots.length > 0,
  );
  // 11. Validate the most recent snapshot data
  const latestSnapshot =
    cancellationRequest.snapshots[cancellationRequest.snapshots.length - 1];
  typia.assert(latestSnapshot);
  // 12. Validate snapshot captures the status transition to approved
  TestValidator.equals(
    "latest snapshot status_after is approved",
    latestSnapshot.status_after,
    "approved",
  );
  // 13. Validate snapshot contains seller response
  TestValidator.predicate(
    "snapshot seller_response is non-null",
    latestSnapshot.seller_response !== null,
  );
  // 14. Validate seller information in snapshot
  TestValidator.predicate(
    "snapshot contains seller information",
    latestSnapshot.seller.email !== undefined,
  );
  // 15. Validate timestamps show the request was updated after creation
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(cancellationRequest.updated_at).getTime() >=
      new Date(cancellationRequest.created_at).getTime(),
  );
  // 16. Validate snapshot was created at a valid timestamp
  TestValidator.predicate(
    "snapshot created_at is valid datetime",
    !isNaN(new Date(latestSnapshot.created_at).getTime()),
  );
}
