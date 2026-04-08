import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test super admin creating a shipment with order items from same seller.
 *
 * Test Flow:
 * 1. SuperAdmin authenticates via authorize_super_admin_join utility
 * 2. SuperAdmin creates a shipment with itemIds from existing orders
 * 3. Validates shipment is created with correct carrier, tracking, and seller info
 * 4. Verifies shipment status is initialized correctly
 * 5. Confirms order items are linked and belong to same seller
 */
export async function test_api_shipment_creation_with_order_items(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
  });
  // Step 2: Generate shipment with order items from same seller
  const shipment =
    await generate_random_ecommerce_mall_super_admin_shipments_create(
      superAdminConnection,
      {},
    );
  typia.assert(shipment);
  // Step 3: Validate shipment has required tracking information
  TestValidator.predicate(
    "tracking number is present",
    shipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "carrier name is present",
    shipment.carrier_name.length > 0,
  );
  TestValidator.predicate("shipped_at timestamp is set", !!shipment.shipped_at);
  // Step 4: Validate seller information and shipment items
  TestValidator.predicate("seller is present", !!shipment.seller);
  TestValidator.predicate(
    "shipment_items array is populated",
    shipment.shipment_items.length > 0,
  );
  // Step 5: Validate all shipment items belong to the same seller
  TestValidator.predicate(
    "all order items belong to same seller",
    shipment.shipment_items.every(
      (item) => item.orderItem.seller.id === shipment.seller.id,
    ),
  );
  // Step 6: Validate each shipment item links to valid order item
  for (const shipmentItem of shipment.shipment_items) {
    typia.assert(shipmentItem);
    TestValidator.predicate(
      "shipment item has valid order item",
      !!shipmentItem.orderItem.id,
    );
    TestValidator.predicate(
      "order item has product info",
      !!shipmentItem.orderItem.product.id,
    );
    TestValidator.predicate(
      "order item has variant info",
      !!shipmentItem.orderItem.variant.id,
    );
  }
  // Step 7: Validate shipment status is valid
  TestValidator.predicate(
    "shipment status is valid",
    shipment.status === "in_transit" || shipment.status === "delivered",
  );
  // Step 8: Validate timestamps
  TestValidator.predicate("created_at is set", !!shipment.created_at);
  TestValidator.predicate("updated_at is set", !!shipment.updated_at);
}
