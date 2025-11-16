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
 * Validate that a platform administrator can view the complete shipment detail
 * for a specific shipment record via the admin API.
 *
 * - Ensures authentication as an admin, using the join endpoint
 * - Creates a shipping partner for assignment
 * - Creates a shipment using the shipping partner, in admin context
 * - Fetches the shipment detail via the shipment's unique id
 * - Validates all shipment detail fields:
 *
 *   - Order (summary)
 *   - OrderItem (summary)
 *   - ShippingPartner (summary)
 *   - Status, tracking code, manifest url, provider_response_code
 *   - Audit actor (createdByAdmin)
 *   - All relevant timestamps
 * - Verifies that all references are populated and IDs match and that audit/admin
 *   actor fields are accessible by admin user
 * - Verifies that fields reflect the system state as expected from creation and
 *   assignment (permissions/edge cases like non-existent ID or wrong role are
 *   not tested here)
 */
export async function test_api_shipment_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and is authenticated
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Admin creates a shipping partner
  const partnerInput = {
    partner_name: RandomGenerator.name(),
    partner_code: RandomGenerator.alphaNumeric(10),
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallShippingPartner.ICreate;
  const partner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      { body: partnerInput },
    );
  typia.assert(partner);

  // 3. Create sample order summary and item summary
  // Because shipment requires valid order/orderItem/SKU,
  // We'll simulate these as random summaries (in real e2e, these would be created via order flow)
  const order: IShoppingMallOrder.ISummary =
    typia.random<IShoppingMallOrder.ISummary>();
  const item: IShoppingMallOrderItem.ISummary =
    typia.random<IShoppingMallOrderItem.ISummary>();

  // 4. Create the shipment as admin, assigning partner and self as creator
  const createInput = {
    order_id: order.id,
    order_item_id: item.id,
    shipping_partner_id: partner.id,
    carrier_tracking_code: RandomGenerator.alphaNumeric(12),
    status: "ready",
    manifest_url: null,
    provider_response_code: RandomGenerator.alphaNumeric(6),
    created_by_admin_id: admin.id,
    created_by_seller_id: undefined,
  } satisfies IShoppingMallShipment.ICreate;
  const created = await api.functional.shoppingMall.admin.shipments.create(
    connection,
    { body: createInput },
  );
  typia.assert(created);

  // 5. Fetch shipment detail as admin using shipmentId
  const fetched = await api.functional.shoppingMall.admin.shipments.at(
    connection,
    { shipmentId: created.id },
  );
  typia.assert(fetched);

  // 6. Validate all fields
  // Core entity and reference IDs match
  TestValidator.equals("shipment id matches", fetched.id, created.id);
  TestValidator.equals("order ref matches", fetched.order.id, order.id);
  TestValidator.equals("order item id matches", fetched.orderItem.id, item.id);
  TestValidator.equals(
    "shipping partner id matches",
    fetched.shippingPartner.id,
    partner.id,
  );

  // Audit/actor field (createdByAdmin)
  TestValidator.equals(
    "createdByAdmin id matches",
    fetched.createdByAdmin?.id,
    admin.id,
  );
  TestValidator.equals(
    "createdByAdmin email matches",
    fetched.createdByAdmin?.email,
    admin.email,
  );
  TestValidator.equals(
    "createdByAdmin name matches",
    fetched.createdByAdmin?.name,
    admin.name,
  );

  // Status and codes
  TestValidator.equals("shipment status is 'ready'", fetched.status, "ready");
  TestValidator.equals(
    "carrier tracking code matches",
    fetched.carrier_tracking_code,
    createInput.carrier_tracking_code,
  );
  TestValidator.equals(
    "provider response code matches",
    fetched.provider_response_code,
    createInput.provider_response_code,
  );
  TestValidator.equals("manifest url is null", fetched.manifest_url, null);
  // Ensure timestamps are ISO date strings (typia.assert already guarantees this)
  // All non-applicable fields (createdBySeller, delivery_at, cancelled_at) should be null or undefined
  TestValidator.equals(
    "createdBySeller is null",
    fetched.createdBySeller,
    null,
  );
  TestValidator.equals(
    "delivery_at is null or undefined",
    fetched.delivery_at,
    null,
  );
  TestValidator.equals(
    "cancelled_at is null or undefined",
    fetched.cancelled_at,
    null,
  );
}
