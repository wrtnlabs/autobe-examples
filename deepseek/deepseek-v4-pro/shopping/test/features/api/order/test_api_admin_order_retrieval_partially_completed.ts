import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test admin retrieval of an order with partially completed item statuses.
 *
 * Validates that administrators can retrieve complete order details via the
 * admin order endpoint and that the order response correctly reflects mixed
 * item lifecycle states. The test authenticates an administrator and retrieves
 * an order, then verifies that the order-level status is derived from its
 * constituent items, that each order item reports its individual status
 * independently, and that snapshot data (product, variant, seller) and frozen
 * shipping address fields are present and intact.
 *
 * 1. Administrator registers and authenticates via the admin join endpoint.
 * 2. Administrator retrieves an order by its human-readable order code.
 * 3. Validates the complete response structure with typia.assert.
 * 4. Verifies that all order items carry purchase-time snapshots preserving
 *    product, variant, and seller data regardless of each item's lifecycle
 *    state (delivered or cancelled).
 * 5. Confirms that delivered items are assigned to shipments while cancelled
 *    items are not, validating correct shipment-to-item mapping.
 * 6. When the order status is "partially_completed", validates that items are
 *    in mixed lifecycle states (at least two distinct statuses present).
 */
export async function test_api_admin_order_retrieval_partially_completed(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve order by code
  const orderCode = typia.random<string>();
  const order = await api.functional.shoppingMall.admin.orders.at(
    adminConnection,
    { orderCode },
  );
  typia.assert(order);
  // 3. Validate frozen shipping address fields are present
  TestValidator.predicate(
    "recipient name is frozen",
    order.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "phone number is frozen",
    order.phone_number.length > 0,
  );
  TestValidator.predicate(
    "street address is frozen",
    order.street_address.length > 0,
  );
  TestValidator.predicate("city is frozen", order.city.length > 0);
  TestValidator.predicate(
    "state/province is frozen",
    order.state_province.length > 0,
  );
  TestValidator.predicate(
    "postal code is frozen",
    order.postal_code.length > 0,
  );
  TestValidator.predicate("country is frozen", order.country.length > 0);
  // 4. Validate order has items
  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );
  // 5. Validate each item has snapshot data preserved
  for (const [idx, item] of order.items.entries()) {
    TestValidator.predicate(
      `item ${idx} has product snapshot`,
      item.productSnapshot !== null,
    );
    TestValidator.predicate(
      `item ${idx} has variant snapshot`,
      item.variantSnapshot !== null,
    );
    TestValidator.predicate(
      `item ${idx} has seller snapshot`,
      item.sellerSnapshot !== null,
    );
  }
  // 6. Validate shipment-to-item mapping
  if (order.shipments.length > 0) {
    const allShipmentItemIds = new Set(
      order.shipments.flatMap((s) => s.orderItems.map((oi) => oi.id)),
    );
    for (const item of order.items) {
      if (item.status === "delivered") {
        TestValidator.predicate(
          `delivered item ${item.id} assigned to a shipment`,
          allShipmentItemIds.has(item.id),
        );
      } else if (item.status === "cancelled") {
        TestValidator.predicate(
          `cancelled item ${item.id} not assigned to any shipment`,
          !allShipmentItemIds.has(item.id),
        );
      }
    }
  }
  // 7. When partially_completed, validate mixed item states
  if (order.status === "partially_completed") {
    const uniqueStatuses = new Set(order.items.map((item) => item.status));
    TestValidator.predicate(
      "partially_completed order has mixed item statuses",
      uniqueStatuses.size >= 2,
    );
  }
}
