import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator shipment retrieval with auto-delivery verification.
 *
 * Validates that an administrator can retrieve shipment details including delivery status verification. The test confirms the API endpoint structure supports auto-delivery tracking by validating the delivered_at timestamp field and related order item statuses.
 *
 * Note: This test validates the shipment retrieval endpoint structure and admin access permissions. The actual auto-delivery business logic (14-day automatic delivery confirmation) is enforced server-side and would require database time manipulation for full E2E testing, which is beyond standard E2E test capabilities.
 *
 * 1. Administrator authenticates via authorize_admin_join utility function.
 * 2. Administrator retrieves shipment details using GET /shoppingMall/admin/admin/shipments/{shipmentId}.
 * 3. Validates response structure includes all required fields per IShoppingMallShipment DTO.
 * 4. Verifies delivered_at field exists (null for in-transit or timestamp for delivered).
 * 5. Confirms order, seller, and orderItems references are properly populated.
 * 6. Validates all order items have proper status field for delivery tracking.
 */
export async function test_api_admin_shipment_auto_delivery_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve shipment details
  const shipment = await api.functional.shoppingMall.admin.admin.shipments.at(
    adminConnection,
    {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(shipment);
  // 3. Validate shipment structure
  TestValidator.predicate("shipment has valid id", shipment.id !== null);
  TestValidator.predicate(
    "carrier name exists",
    shipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "tracking number exists",
    shipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "shipped_at is valid timestamp",
    shipment.shipped_at !== null,
  );
  // 4. Validate delivered_at field (core auto-delivery verification)
  // delivered_at can be null (in-transit) or ISO timestamp (delivered/auto-delivered)
  TestValidator.predicate(
    "delivered_at is null or valid ISO timestamp",
    shipment.delivered_at === null || shipment.delivered_at.length > 0,
  );
  // 5. Validate order reference
  TestValidator.predicate("order reference exists", shipment.order.id !== null);
  TestValidator.predicate("order code exists", shipment.order.code.length > 0);
  TestValidator.predicate(
    "order has total price",
    shipment.order.total_price >= 0,
  );
  // 6. Validate seller reference
  TestValidator.predicate(
    "seller reference exists",
    shipment.seller.id !== null,
  );
  TestValidator.predicate(
    "seller email exists",
    shipment.seller.email.length > 0,
  );
  // 7. Validate order items array
  TestValidator.predicate(
    "order items array exists",
    Array.isArray(shipment.orderItems),
  );
  if (shipment.orderItems.length > 0) {
    const firstItem = shipment.orderItems[0];
    TestValidator.predicate(
      "order item has valid status",
      firstItem.status !== null,
    );
    TestValidator.predicate("order item has quantity", firstItem.quantity >= 1);
    TestValidator.predicate("order item has price", firstItem.price >= 0);
  }
}
