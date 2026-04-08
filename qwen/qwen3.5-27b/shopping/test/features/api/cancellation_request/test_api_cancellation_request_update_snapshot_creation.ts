import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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

/**
 * Test snapshot creation when updating cancellation request status from pending to approved.
 *
 * This test verifies that when an administrator updates a cancellation request status, an immutable snapshot is automatically created capturing the complete state transition. The snapshot preserves the before and after status values, the response reason, and all relevant identifiers for audit trail and dispute resolution purposes.
 *
 * Special attention is given to verifying that the snapshot contains accurate status transition data (pending → approved), includes the seller's response reason, and is properly linked to both the cancellation request and the responding seller.
 *
 * 1. Administrator authenticates with the shopping mall platform.
 * 2. Administrator updates a cancellation request with status='approved' and response_reason.
 * 3. Validates that the updated cancellation request includes a snapshot in the snapshots array.
 * 4. Verifies the snapshot contains status_before='pending', status_after='approved', and the response_reason.
 * 5. Confirms the snapshot includes seller information and cancellation request reference.
 * 6. Validates the snapshot created_at timestamp is present and valid.
 */
export async function test_api_cancellation_request_update_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
      ip: "127.0.0.1",
    },
  });
  // 2. Update cancellation request with status change
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const responseReason = "Customer requested cancellation, approved by seller";
  const updatedRequest =
    await api.functional.shoppingMall.administrator.cancellation_requests.update(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          status: "approved",
          response_reason: responseReason,
        },
      },
    );
  typia.assert(updatedRequest);
  // 3. Verify snapshot was created
  TestValidator.predicate(
    "snapshot array is not empty",
    updatedRequest.snapshots.length > 0,
  );
  // 4. Get the latest snapshot
  const latestSnapshot =
    updatedRequest.snapshots[updatedRequest.snapshots.length - 1];
  typia.assert(latestSnapshot);
  // 5. Verify snapshot contains correct status transition
  TestValidator.equals(
    "status_before is pending",
    latestSnapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "status_after is approved",
    latestSnapshot.status_after,
    "approved",
  );
  // 6. Verify snapshot contains response reason
  TestValidator.equals(
    "seller_response matches provided reason",
    latestSnapshot.seller_response,
    responseReason,
  );
  // 7. Verify snapshot contains cancellation request reference
  TestValidator.equals(
    "cancellation request ID matches",
    latestSnapshot.cancellationRequest.id,
    cancellationRequestId,
  );
  // 8. Verify snapshot contains seller information
  TestValidator.predicate(
    "seller information is present",
    latestSnapshot.seller.id !== undefined &&
      latestSnapshot.seller.email !== undefined,
  );
  // 9. Verify snapshot created_at timestamp is valid
  TestValidator.predicate(
    "created_at timestamp is valid date-time",
    !isNaN(Date.parse(latestSnapshot.created_at)),
  );
  // 10. Verify the updated request status is approved
  TestValidator.equals(
    "cancellation request status is approved",
    updatedRequest.status,
    "approved",
  );
  // 11. Verify the updated request contains the response reason
  TestValidator.equals(
    "response_reason is set",
    updatedRequest.response_reason,
    responseReason,
  );
}
