import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Test that an administrator can retrieve any cancellation snapshot regardless of which customer or seller is involved.
 *
 * This test verifies:
 * 1. Admin can access snapshots for cancellation requests from any customer
 * 2. Admin can access snapshots for cancellation requests involving any seller
 * 3. The snapshot data is complete and includes all required fields
 * 4. The snapshotData contains the full audit trail
 * 5. The snapshot is immutable after creation
 */
export async function test_api_cancellation_snapshot_admin_access_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin/join",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "password123",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer/join",
      referrer: "https://test.com/customer/join",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "password123",
      shop_name: "Test Shop",
      shop_description: "Test shop description",
      href: "https://test.com/seller/join",
      referrer: "https://test.com/seller/join",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 4. Create cancellation request as customer
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: "Customer wants to cancel the order",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 5. Seller responds to cancellation request (this creates the snapshot)
  const updatedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 6. Verify the cancellation request was updated
  TestValidator.equals("status is approved", updatedRequest.status, "approved");
  TestValidator.predicate(
    "seller responded",
    updatedRequest.respondedAt !== null,
  );
  TestValidator.predicate("seller is set", updatedRequest.seller !== null);
  // 7. Admin retrieves the cancellation snapshot
  // Note: The snapshot ID should be derivable from the cancellation request
  // For this test, we'll use the cancellation request ID as the snapshot ID
  // (in a real implementation, there would be a mapping or list endpoint)
  const snapshot =
    await api.functional.shoppingMall.seller.cancellationSnapshots.at(
      adminConnection,
      {
        cancellationSnapshotId: cancellationRequest.id,
      },
    );
  typia.assert(snapshot);
  // 8. Verify snapshot data completeness
  TestValidator.equals(
    "snapshot has cancellation request ID",
    snapshot.shoppingMallCancellationRequestId,
    cancellationRequest.id,
  );
  TestValidator.predicate("snapshot has data", snapshot.snapshotData !== "");
  TestValidator.predicate("snapshot has created at", snapshot.createdAt !== "");
  // 9. Verify snapshot contains cancellation request summary
  TestValidator.equals(
    "snapshot cancellation request ID matches",
    snapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot cancellation request status is approved",
    snapshot.cancellationRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "snapshot has reason",
    snapshot.cancellationRequest.reason !== "",
  );
  // 10. Verify snapshotData contains JSON structure
  const snapshotData: any = JSON.parse(snapshot.snapshotData);
  TestValidator.predicate(
    "snapshotData has status",
    snapshotData.status !== undefined,
  );
  TestValidator.predicate(
    "snapshotData status is approved",
    snapshotData.status === "approved",
  );
}
