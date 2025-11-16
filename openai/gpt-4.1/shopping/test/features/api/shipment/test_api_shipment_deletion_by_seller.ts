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
 * Test that a seller can successfully delete their own eligible shipment when
 * the business rules allow (i.e., shipment is not in transit/delivered/locked,
 * and has no dependent tracking histories). Flow:
 *
 * 1. Register admin user and authenticate as admin.
 * 2. Register shipping partner as admin.
 * 3. Register and authenticate a seller user.
 * 4. As admin, create a new shipment for a random order/item, marked as
 *    created_by_seller_id for this seller, with status 'pending'.
 * 5. Authenticate as the seller (token context switch).
 * 6. Seller deletes their own shipment before it transitions status.
 * 7. Confirm successful deletion (should not throw error), and that the shipment
 *    cannot be deleted again (error). Optionally, seller can check listings (if
 *    such endpoint accessible) to verify absence.
 */
export async function test_api_shipment_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // Step 2: Register shipping partner (admin only)
  const shippingPartner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          partner_code: RandomGenerator.alphaNumeric(8),
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(shippingPartner);

  // Step 3: Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword satisfies string,
        business_name: RandomGenerator.name(),
        registration_number: RandomGenerator.alphaNumeric(12),
        business_phone: RandomGenerator.mobile(),
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/landing",
        ip: null,
      },
    });
  typia.assert(seller);

  // Step 4: Authenticate as admin (again) and create a shipment attributed to this seller for a random order/order item
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // Use random UUIDs for order/item - in a real system, you'd generate a real order and order item, but they're out of scope for this test
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.create(connection, {
      body: {
        order_id: orderId,
        order_item_id: orderItemId,
        shipping_partner_id: shippingPartner.id,
        carrier_tracking_code: null,
        status: "pending",
        manifest_url: null,
        provider_response_code: null,
        created_by_admin_id: null,
        created_by_seller_id: seller.id,
      },
    });
  typia.assert(shipment);

  // Step 5: Authenticate as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.example.com/dashboard",
      referrer: "https://test.example.com/login",
      ip: null,
    },
  });

  // Step 6: Seller deletes their own eligible shipment
  await api.functional.shoppingMall.seller.shipments.erase(connection, {
    shipmentId: shipment.id,
  });

  // Step 7: Attempt deletion again (should fail, shipment is already deleted)
  await TestValidator.error(
    "re-deleting same shipment should fail",
    async () => {
      await api.functional.shoppingMall.seller.shipments.erase(connection, {
        shipmentId: shipment.id,
      });
    },
  );
}
