import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the retrieval of shipment items for a specific shipment by an authenticated admin user.
 * 1. Register as admin user to obtain authentication credentials
 * 2. Retrieve shipment items using the target endpoint
 * 3. Validate that the response includes shipment item details with nested information
 */
export async function test_api_shipment_items_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate test shipment ID
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve shipment items
  const itemsResult: IEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.admin.shipmentItems.items.getItems(
      adminConnection,
      {
        shipmentId,
      },
    );
  typia.assert(itemsResult);
  // 4. Validate response structure - work with single item (SDK defines ISummary as response)
  const item: IEcommerceMallShipmentItem.ISummary = itemsResult;
  // 5. Validate shipment reference
  typia.assert(item.shipment);
  TestValidator.predicate(
    "shipment carrier name is non-empty",
    item.shipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "shipment tracking number is non-empty",
    item.shipment.tracking_number.length > 0,
  );
  // 6. Validate order item properties with business logic
  typia.assert(item.orderItem);
  TestValidator.predicate(
    "order item quantity is at least 1",
    item.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item unit price is positive",
    item.orderItem.unitPrice > 0,
  );
  TestValidator.predicate(
    "order item status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      item.orderItem.itemStatus,
    ),
  );
  // 7. Validate order reference
  typia.assert(item.orderItem.order);
  TestValidator.equals(
    "order has order number",
    item.orderItem.order.order_number.length > 0,
    true,
  );
  // 8. Validate snapshots are non-empty strings
  TestValidator.equals(
    "product snapshot is non-empty string",
    item.orderItem.productSnapshot.length > 0,
    true,
  );
  TestValidator.equals(
    "variant snapshot is non-empty string",
    item.orderItem.variantSnapshot.length > 0,
    true,
  );
  TestValidator.equals(
    "seller profile snapshot is non-empty string",
    item.orderItem.sellerProfileSnapshot.length > 0,
    true,
  );
  // 9. Validate snapshot structure contains expected JSON
  const productSnapshot = JSON.parse(item.orderItem.productSnapshot);
  TestValidator.equals(
    "product snapshot has name",
    typeof productSnapshot.name === "string",
    true,
  );
  const variantSnapshot = JSON.parse(item.orderItem.variantSnapshot);
  TestValidator.equals(
    "variant snapshot has SKU code",
    typeof variantSnapshot.sku_code === "string",
    true,
  );
  const sellerSnapshot = JSON.parse(item.orderItem.sellerProfileSnapshot);
  TestValidator.equals(
    "seller snapshot has shop name",
    typeof sellerSnapshot.shop_name === "string",
    true,
  );
}
