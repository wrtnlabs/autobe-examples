import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate that an administrator can create a shipment with valid order, item,
 * and shipping partner.
 *
 * 1. Register a new admin (join)
 * 2. Register a new shipping partner as the admin
 * 3. Prepare mock order and order item summaries for shipment business references
 * 4. Create a shipment as the admin (with created_by_admin_id attributed)
 * 5. Assert that returned shipment record includes all inputted values and admin
 *    audit
 *
 * Note: Using randomly generated but schema-compliant mock objects to simulate
 * order and item references due to the absence of actual order/item creation
 * endpoints in this isolated scenario.
 */
export async function test_api_shipment_creation_by_admin_with_valid_partner(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "Aa!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Register shipping partner
  const partnerInput = {
    partner_name: RandomGenerator.paragraph({ sentences: 2 }),
    partner_code: RandomGenerator.alphaNumeric(8),
    status: RandomGenerator.pick(["active", "inactive", "deprecated"] as const),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallShippingPartner.ICreate;
  const partner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: partnerInput,
      },
    );
  typia.assert(partner);

  // 3. Prepare fake order and order item summaries (simulate references)
  // Because endpoints for creating actual orders/items are not available, we generate random summaries for referential integrity tests.
  const orderSummary: IShoppingMallOrder.ISummary =
    typia.random<IShoppingMallOrder.ISummary>();
  const orderItemSummary: IShoppingMallOrderItem.ISummary = {
    ...typia.random<IShoppingMallOrderItem.ISummary>(),
    shopping_mall_order_id: orderSummary.id,
  };

  // 4. Create new shipment as admin
  const shipmentInput = {
    order_id: orderSummary.id,
    order_item_id: orderItemSummary.id,
    shipping_partner_id: partner.id,
    carrier_tracking_code: RandomGenerator.alphaNumeric(12),
    status: RandomGenerator.pick([
      "pending",
      "ready",
      "picked_up",
      "in_transit",
      "delivered",
      "cancelled",
      "returned",
    ] as const),
    manifest_url:
      `https://example.com/manifest/${RandomGenerator.alphaNumeric(8)}` as string &
        tags.Format<"uri">,
    provider_response_code: RandomGenerator.alphaNumeric(6),
    created_by_admin_id: admin.id,
    created_by_seller_id: null,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment = await api.functional.shoppingMall.admin.shipments.create(
    connection,
    {
      body: shipmentInput,
    },
  );
  typia.assert(shipment);

  // 5. Validate key properties and admin attribution in returned record
  TestValidator.equals(
    "shipment's order.id matches input order_id",
    shipment.order.id,
    shipmentInput.order_id,
  );
  TestValidator.equals(
    "shipment's orderItem.id matches input order_item_id",
    shipment.orderItem.id,
    shipmentInput.order_item_id,
  );
  TestValidator.equals(
    "shipment's shippingPartner.id matches input shipping_partner_id",
    shipment.shippingPartner.id,
    shipmentInput.shipping_partner_id,
  );
  TestValidator.equals(
    "shipment status matches input",
    shipment.status,
    shipmentInput.status,
  );
  TestValidator.equals(
    "shipment carrier_tracking_code matches input",
    shipment.carrier_tracking_code,
    shipmentInput.carrier_tracking_code,
  );
  TestValidator.equals(
    "shipment manifest_url matches input",
    shipment.manifest_url,
    shipmentInput.manifest_url,
  );
  TestValidator.equals(
    "shipment provider_response_code matches input",
    shipment.provider_response_code,
    shipmentInput.provider_response_code,
  );
  TestValidator.equals(
    "shipment createdByAdmin attribution matches admin",
    shipment.createdByAdmin?.id,
    admin.id,
  );
  TestValidator.equals(
    "shipment createdBySeller attribution must be null",
    shipment.createdBySeller,
    null,
  );
}
