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
 * Test seller creates a shipment with a valid, platform-registered shipping
 * partner.
 *
 * Steps:
 *
 * 1. Create and authenticate admin
 * 2. Admin registers a new shipping partner
 * 3. Create and authenticate seller
 * 4. Seller creates a shipment for a placeholder order/item referencing the
 *    shipping partner, verifying correct actor attribution and shipment record
 *    integrity
 *
 * Note: Because API does not expose order creation or lookup, order/item UUIDs
 * are generated using typia.random for schema compliance, and only schema-level
 * existence/integrity is validated, not runtime order linkage.
 */
export async function test_api_shipment_creation_by_seller_with_valid_partner(
  connection: api.IConnection,
) {
  // 1. Admin signup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Admin creates a shipping partner
  const partnerName = RandomGenerator.name(2);
  const partnerCode = RandomGenerator.alphaNumeric(8);
  const partnerDescription = RandomGenerator.paragraph();
  const partner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: partnerName,
          partner_code: partnerCode,
          status: "active",
          description: partnerDescription,
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(partner);

  // 3. Seller signup
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerBusinessName = RandomGenerator.paragraph({ sentences: 2 });
  const sellerRegNum = RandomGenerator.alphaNumeric(10);
  const sellerPhone = RandomGenerator.mobile();
  // Put required URI fields (any valid URIs)
  const sellerHref = "https://seller-portal.example.com/signup";
  const sellerReferrer = "https://mall.example.com/";

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: sellerBusinessName,
      registration_number: sellerRegNum,
      business_phone: sellerPhone,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerAuth);

  // Switch to seller session
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller-portal.example.com/dashboard",
      referrer: sellerHref,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 4. Seller creates shipment for placeholder order/item
  // Because order/item creation is not exposed, create placeholder UUIDs
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  const fakeOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipmentStatus = RandomGenerator.pick([
    "pending",
    "ready",
    "picked_up",
    "in_transit",
    "delivered",
    "cancelled",
    "returned",
  ] as const);
  const carrierTrackingCode = RandomGenerator.alphaNumeric(12);
  const manifestUrl = "https://tracking.carrier.com/manifest1234";
  const providerResponseCode = RandomGenerator.alphaNumeric(6);

  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    connection,
    {
      body: {
        order_id: fakeOrderId,
        order_item_id: fakeOrderItemId,
        shipping_partner_id: partner.id,
        carrier_tracking_code: carrierTrackingCode,
        status: shipmentStatus,
        manifest_url: manifestUrl,
        provider_response_code: providerResponseCode,
        created_by_seller_id: sellerAuth.id,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);

  // Validate shipment record
  TestValidator.equals(
    "shipment references the correct shipping partner",
    shipment.shippingPartner.id,
    partner.id,
  );
  TestValidator.equals(
    "shipment createdBySeller references correct seller",
    shipment.createdBySeller?.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "shipment status matches input",
    shipment.status,
    shipmentStatus,
  );
  TestValidator.equals(
    "shipment carrier_tracking_code matches input",
    shipment.carrier_tracking_code,
    carrierTrackingCode,
  );
}
