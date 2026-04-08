import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
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
 * Test that an administrator can view a cancellation request snapshot for audit purposes.
 *
 * Validates the cancellation request snapshot viewing functionality for administrators. This test verifies that administrators can access snapshot records containing complete audit trail information for cancellation requests that have been approved or rejected by sellers.
 *
 * Note: This test assumes a cancellation request snapshot already exists in the system. In a full integration test scenario, this would be preceded by seller registration, product creation, order placement, cancellation request creation, and seller approval steps, but those endpoints are not available in the current SDK.
 *
 * 1. Administrator registers and authenticates for system access.
 * 2. Administrator retrieves a cancellation request snapshot by ID.
 * 3. Validates snapshot contains correct request type ('cancellation').
 * 4. Validates status transition fields (statusBefore, statusAfter).
 * 5. Validates that cancellationRequestId is populated and refundRequestId is null.
 * 6. Validates all nested references (customer, seller, orderItem) are present.
 */
export async function test_api_request_snapshot_administrator_view_cancellation(
  connection: api.IConnection,
) {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin1234",
      href: "https://mall.com/admin/join",
      referrer: "https://mall.com/admin",
    },
  });
  // 2. Generate a snapshot ID for testing
  // In a full scenario, this would be the ID from a previously created cancellation snapshot
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Administrator retrieves the cancellation request snapshot
  const snapshot =
    await api.functional.shoppingMall.administrator.request_snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure and content
  TestValidator.equals(
    "request type is cancellation",
    snapshot.requestType,
    "cancellation",
  );
  TestValidator.equals(
    "status before is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.predicate(
    "status after is approved or rejected",
    snapshot.statusAfter === "approved" || snapshot.statusAfter === "rejected",
  );
  TestValidator.predicate(
    "seller reason is present or null",
    snapshot.sellerReason === null || snapshot.sellerReason.length > 0,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "cancellation request ID is populated",
    snapshot.cancellationRequestId !== null,
  );
  TestValidator.equals(
    "refund request ID is null for cancellation",
    snapshot.refundRequestId,
    null,
  );
  TestValidator.predicate(
    "has order item reference",
    snapshot.orderItemId.length > 0,
  );
  TestValidator.predicate(
    "customer reference exists",
    snapshot.customer.id.length > 0,
  );
  TestValidator.predicate(
    "seller reference exists",
    snapshot.seller.id.length > 0,
  );
  TestValidator.predicate(
    "order item reference exists",
    snapshot.orderItem.id.length > 0,
  );
  // 5. Validate nested entity structures
  TestValidator.predicate(
    "customer has email",
    snapshot.customer.email.length > 0,
  );
  TestValidator.predicate(
    "customer has display name",
    snapshot.customer.display_name.length > 0,
  );
  TestValidator.predicate("seller has email", snapshot.seller.email.length > 0);
  TestValidator.predicate(
    "seller profile has shop name",
    snapshot.seller.seller_profile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "order item has quantity",
    snapshot.orderItem.quantity > 0,
  );
  TestValidator.predicate("order item has price", snapshot.orderItem.price > 0);
  TestValidator.predicate(
    "order item has status",
    snapshot.orderItem.status.length > 0,
  );
}
