import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Test the ability of an authenticated seller to update shipment details on an
 * order where the shipment was created by an admin. The workflow covers seller
 * onboarding, admin shipment creation, seller updating of modifiable fields,
 * and verification of permission rules and reference integrity.
 */
export async function test_api_seller_update_shipment_from_admin_created(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPw = RandomGenerator.alphaNumeric(12);
  const sellerRegNumber = RandomGenerator.alphaNumeric(10);
  const sellerAccount = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPw,
      business_name: RandomGenerator.name(2),
      registration_number: sellerRegNumber,
      business_phone: RandomGenerator.mobile(),
      href: "https://seller-portal.test/onboarding",
      referrer: "https://seller-portal.test/landing",
      ip: undefined,
    },
  });
  typia.assert(sellerAccount);

  // 2. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPw = RandomGenerator.alphaNumeric(12);
  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPw,
      name: RandomGenerator.name(1),
    },
  });
  typia.assert(adminAccount);

  // 3. Switch to admin to create shipment
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPw,
    },
  });

  // 4. Simulate order number and shipping partner
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const shippingPartnerId = typia.random<string & tags.Format<"uuid">>();

  // 5. Create shipment as admin
  const shipmentInput = {
    shipping_partner_id: shippingPartnerId,
    tracking_number: RandomGenerator.alphaNumeric(14),
    status: "pending",
    ship_date: new Date().toISOString(),
    expected_delivery_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies IShoppingMallOrderShipment.ICreate;
  const createdShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderNumber,
        body: shipmentInput,
      },
    );
  typia.assert(createdShipment);

  // 6. Switch back to seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPw,
      href: "https://seller-portal.test/login",
      referrer: "https://seller-portal.test/restore",
      ip: undefined,
    },
  });

  // 7. Update shipment as seller
  const updatedTrackingNumber = RandomGenerator.alphaNumeric(16);
  const updateInput = {
    shopping_mall_shipping_partner_id: shippingPartnerId,
    tracking_number: updatedTrackingNumber,
    status: "shipped",
    ship_date: new Date().toISOString(),
    expected_delivery_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    delivered_at: undefined,
  } satisfies IShoppingMallOrderShipment.IUpdate;
  const updatedShipment =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderNumber,
        shipmentId: createdShipment.id,
        body: updateInput,
      },
    );
  typia.assert(updatedShipment);

  // 8. Validate updated fields match input and parent references
  TestValidator.equals(
    "tracking number updated",
    updatedShipment.tracking_number,
    updatedTrackingNumber,
  );
  TestValidator.equals(
    "shipping partner updated",
    updatedShipment.shippingPartner.id,
    shippingPartnerId,
  );
  TestValidator.equals("status updated", updatedShipment.status, "shipped");
  TestValidator.equals(
    "expected delivery date updated",
    updatedShipment.expected_delivery_date,
    updateInput.expected_delivery_date,
  );
  TestValidator.equals(
    "shipment's parent order matches",
    updatedShipment.order.order_number,
    orderNumber,
  );
  TestValidator.equals(
    "shipment ID stays same",
    updatedShipment.id,
    createdShipment.id,
  );
  TestValidator.equals(
    "created_at does not change",
    updatedShipment.created_at,
    createdShipment.created_at,
  );

  // 9. Attempt error scenario: disallowed status transition (invalid business status)
  await TestValidator.error(
    "disallowed shipment status transition (invalid-status)",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.update(
        connection,
        {
          orderNumber,
          shipmentId: createdShipment.id,
          body: {
            status: "invalid-status",
          } satisfies IShoppingMallOrderShipment.IUpdate,
        },
      );
    },
  );
}
