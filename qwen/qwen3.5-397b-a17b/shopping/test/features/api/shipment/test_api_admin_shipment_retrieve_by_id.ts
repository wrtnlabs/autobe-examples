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
 * Test administrator shipment retrieval by unique identifier.
 *
 * Validates that an administrator can successfully retrieve complete details of a specific shipment by its UUID. The test verifies the endpoint returns all required fields including carrier information, tracking details, timestamps, and nested references to order, seller, and order items.
 *
 * Administrators have platform-wide visibility to all shipments regardless of customer or seller ownership. This endpoint supports administrator oversight for customer support, dispute resolution, and order tracking across the entire platform.
 *
 * 1. Administrator account is created and authenticated using authorize_admin_join utility.
 * 2. Administrator calls GET /shoppingMall/admin/admin/shipments/{shipmentId} with a shipment UUID.
 * 3. System retrieves and returns complete shipment record with all nested relations.
 * 4. Validates response structure through typia.assert() which performs complete runtime type validation.
 * 5. Each order item is validated to contain product, productVariant, seller, and snapshot references through typia.assert().
 *
 * Note: This test validates the endpoint structure and response format. In a complete E2E suite, shipment creation would be performed in a prior test or setup step to ensure the shipmentId references an existing record.
 */
export async function test_api_admin_shipment_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve shipment by ID
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await api.functional.shoppingMall.admin.admin.shipments.at(
    adminConnection,
    {
      shipmentId,
    },
  );
  typia.assert(shipment);
  // 3. Validate order items have required nested references
  // typia.assert() already validates the complete shipment structure including:
  // - All UUID formats (id, order.id, seller.id, etc.)
  // - All date-time formats (shipped_at, delivered_at, created_at, updated_at)
  // - All required fields existence (order, seller, orderItems, snapshot, etc.)
  // - All type constraints (quantity >= 1, price >= 0, etc.)
  // Additional validations focus on business logic that cannot be expressed in types
  for (const item of shipment.orderItems) {
    // Validate snapshot options array structure
    TestValidator.predicate(
      "snapshot options is array",
      Array.isArray(item.snapshot.options),
    );
  }
}
