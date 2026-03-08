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
 * Test the retrieval of shipment items to validate grouping structure.
 * Validates that the API correctly returns shipment item with shared shipment reference
 * and independent order item details.
 */
export async function test_api_shipment_items_multi_item_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve shipment items by valid UUID
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const items =
    await api.functional.ecommerceMall.admin.shipmentItems.items.getItems(
      adminConnection,
      {
        shipmentId,
      },
    );
  typia.assert(items);
  // 3. Validate response structure
  TestValidator.predicate(
    "shipment reference exists",
    items.shipment !== undefined,
  );
  TestValidator.predicate(
    "order item reference exists",
    items.orderItem !== undefined,
  );
  // 4. Validate shared shipment reference fields
  TestValidator.equals(
    "shipment id format",
    items.shipment.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "carrier name is string",
    typeof items.shipment.carrier_name,
    "string",
  );
  TestValidator.equals(
    "tracking number is string",
    typeof items.shipment.tracking_number,
    "string",
  );
  // 5. Validate independent order item details
  TestValidator.equals(
    "order item id format",
    items.orderItem.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "quantity is positive int32",
    items.orderItem.quantity > 0,
    true,
  );
  TestValidator.equals(
    "unit price is number",
    typeof items.orderItem.unitPrice,
    "number",
  );
  TestValidator.equals(
    "item status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      items.orderItem.itemStatus,
    ),
    true,
  );
  TestValidator.equals(
    "product snapshot is string",
    typeof items.orderItem.productSnapshot,
    "string",
  );
  TestValidator.equals(
    "variant snapshot is string",
    typeof items.orderItem.variantSnapshot,
    "string",
  );
  TestValidator.equals(
    "seller profile snapshot is string",
    typeof items.orderItem.sellerProfileSnapshot,
    "string",
  );
}