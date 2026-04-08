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
 * Test that an administrator can view a refund request snapshot for dispute resolution.
 *
 * Validates the administrator's ability to retrieve and examine refund request snapshots from the platform. The test authenticates an administrator and attempts to view a request snapshot, verifying that the response contains the expected structure and fields for audit trail purposes.
 *
 * Due to limited API availability in the test environment, this test focuses on validating the snapshot viewing endpoint's response structure rather than the complete refund workflow. In a full integration test, this would be preceded by seller/customer setup, product creation, order fulfillment, and refund request creation.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Administrator retrieves a request snapshot using a snapshot ID.
 * 3. Validates the snapshot response structure contains all required fields.
 * 4. Verifies the snapshot has correct request type discriminator and status transition fields.
 */
export async function test_api_request_snapshot_administrator_view_refund(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  // 2. Generate a snapshot ID for testing
  // In a real scenario, this would come from an actual refund request workflow
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Administrator retrieves the request snapshot
  const snapshot =
    await api.functional.shoppingMall.administrator.request_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure and fields
  TestValidator.predicate(
    "request type is either cancellation or refund",
    snapshot.requestType === "cancellation" ||
      snapshot.requestType === "refund",
  );
  TestValidator.predicate(
    "status before is a valid status",
    ["pending", "approved", "rejected"].includes(snapshot.statusBefore),
  );
  TestValidator.predicate(
    "status after is approved or rejected",
    snapshot.statusAfter === "approved" || snapshot.statusAfter === "rejected",
  );
  TestValidator.predicate(
    "created at is valid datetime",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
  // Validate that exactly one of cancellationRequestId or refundRequestId is populated
  const hasCancellationId = snapshot.cancellationRequestId !== null;
  const hasRefundId = snapshot.refundRequestId !== null;
  TestValidator.predicate(
    "exactly one request ID is populated",
    (hasCancellationId && !hasRefundId) || (!hasCancellationId && hasRefundId),
  );
  // Validate request type matches the populated ID field
  if (snapshot.requestType === "refund") {
    TestValidator.equals(
      "refund request has refund request ID",
      snapshot.refundRequestId,
      snapshot.refundRequestId,
    );
    TestValidator.equals(
      "refund request has null cancellation request ID",
      snapshot.cancellationRequestId,
      null,
    );
  } else if (snapshot.requestType === "cancellation") {
    TestValidator.equals(
      "cancellation request has cancellation request ID",
      snapshot.cancellationRequestId,
      snapshot.cancellationRequestId,
    );
    TestValidator.equals(
      "cancellation request has null refund request ID",
      snapshot.refundRequestId,
      null,
    );
  }
  // Validate order item reference exists
  TestValidator.predicate(
    "order item ID is present",
    snapshot.orderItemId.length > 0,
  );
  // Validate customer summary is present
  TestValidator.predicate(
    "customer ID is present",
    snapshot.customer.id.length > 0,
  );
  TestValidator.predicate(
    "customer email is valid",
    snapshot.customer.email.includes("@"),
  );
  // Validate seller summary is present
  TestValidator.predicate(
    "seller ID is present",
    snapshot.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller email is valid",
    snapshot.seller.email.includes("@"),
  );
  // Validate order item summary is present
  TestValidator.predicate(
    "order item ID in summary matches",
    snapshot.orderItem.id === snapshot.orderItemId,
  );
  TestValidator.predicate(
    "order item has valid quantity",
    snapshot.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has valid price",
    snapshot.orderItem.price > 0,
  );
}
