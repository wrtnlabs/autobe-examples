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
 * E2E test for shipment update by admin actor.
 *
 * This test covers the following workflow and business rules:
 *
 * 1. Registers both a seller and an admin actor (ensuring separate actors for
 *    correct authorization).
 * 2. Admin creates a new shipping partner (needed for shipment creation).
 * 3. Seller creates an initial shipment using a sample order and order item.
 * 4. Switches session to admin for the update operation and verifies the ability
 *    to update shipment details such as status, tracking code, manifest url,
 *    and provider response code.
 * 5. Checks that updated_by_admin_id is respected in the update and correct actor
 *    attribution appears in the result, while seller attribution is
 *    unmodified.
 * 6. Attempts to perform an invalid status transition and expects it to be
 *    rejected by the API (e.g., moving to 'delivered' directly from pending
 *    without the proper prerequisites).
 * 7. Switches session between actors and verifies permission boundaries.
 */
export async function test_api_shipment_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin (for update action)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register seller (for shipment creation)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerBusinessName = RandomGenerator.name(2);
  const sellerRegistrationNum = RandomGenerator.alphaNumeric(10);
  const sellerPhone = RandomGenerator.mobile();
  const sellerHref = "https://" + RandomGenerator.alphaNumeric(8) + ".test";
  const sellerReferrer = "https://" + RandomGenerator.alphaNumeric(8) + ".ref";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: sellerBusinessName,
        registration_number: sellerRegistrationNum,
        business_phone: sellerPhone,
        href: sellerHref,
        referrer: sellerReferrer,
        ip: undefined,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Switch to admin for shipping partner creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Create a shipping partner
  const partner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.name(2),
          partner_code: RandomGenerator.alphaNumeric(10),
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(partner);

  // 4. Switch to seller for shipment creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Create a sample order and order item for the shipment
  // For E2E, fake order and item (minimal required fields for IDs)
  const fakeOrder: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(12),
    status: "paid",
    total_amount: 47000,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: undefined,
  };
  const fakeSku: IShoppingMallProductSku.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(10),
    product_title: RandomGenerator.paragraph({ sentences: 2 }),
    option_summary: RandomGenerator.name(2),
    in_stock: true,
  };
  const fakeOrderItem: IShoppingMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: fakeOrder.id,
    sku: fakeSku,
    quantity: 2,
    unit_price: 20000,
    subtotal: 40000,
    currency: "KRW",
    delivered: false,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Create the shipment as seller
  const sellerShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.shipments.create(connection, {
      body: {
        order_id: fakeOrder.id,
        order_item_id: fakeOrderItem.id,
        shipping_partner_id: partner.id,
        status: "pending",
        created_by_seller_id: seller.id,
        carrier_tracking_code: null,
        manifest_url: null,
        provider_response_code: null,
      } satisfies IShoppingMallShipment.ICreate,
    });
  typia.assert(sellerShipment);
  TestValidator.equals(
    "shipment created by seller is pending",
    sellerShipment.status,
    "pending",
  );
  TestValidator.equals(
    "shipment seller attribution",
    sellerShipment.createdBySeller?.id,
    seller.id,
  );

  // 5. Switch to admin for update operation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Prepare update request (status to 'in_transit', new carrier code, new manifest URL, new provider code, add updated_by_admin_id)
  const adminUpdateBody = {
    status: "in_transit",
    carrier_tracking_code: RandomGenerator.alphaNumeric(16),
    manifest_url:
      "https://" + RandomGenerator.alphaNumeric(8) + ".cdn/manifest.pdf",
    provider_response_code: RandomGenerator.alphaNumeric(6),
    updated_by_admin_id: admin.id,
  } satisfies IShoppingMallShipment.IUpdate;
  const updated: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.update(connection, {
      shipmentId: sellerShipment.id,
      body: adminUpdateBody,
    });
  typia.assert(updated);
  TestValidator.equals(
    "shipment status updated by admin",
    updated.status,
    "in_transit",
  );
  TestValidator.equals(
    "carrier tracking code updated",
    updated.carrier_tracking_code,
    adminUpdateBody.carrier_tracking_code,
  );
  TestValidator.equals(
    "manifest url updated",
    updated.manifest_url,
    adminUpdateBody.manifest_url,
  );
  TestValidator.equals(
    "provider response code updated",
    updated.provider_response_code,
    adminUpdateBody.provider_response_code,
  );
  TestValidator.equals(
    "shipment updatedByAdmin attribution",
    updated.createdByAdmin?.id,
    admin.id,
  );
  TestValidator.equals(
    "shipment original seller attribution remains",
    updated.createdBySeller?.id,
    seller.id,
  );

  // 6. Try invalid status transition: e.g. skipping to 'delivered' from pending without proper steps (should error)
  // Create new shipment for this
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  const anotherShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.shipments.create(connection, {
      body: {
        order_id: fakeOrder.id,
        order_item_id: fakeOrderItem.id,
        shipping_partner_id: partner.id,
        status: "pending",
        created_by_seller_id: seller.id,
      } satisfies IShoppingMallShipment.ICreate,
    });
  typia.assert(anotherShipment);
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  await TestValidator.error(
    "admin forbidden to update shipment directly to delivered from pending",
    async () => {
      await api.functional.shoppingMall.admin.shipments.update(connection, {
        shipmentId: anotherShipment.id,
        body: {
          status: "delivered",
          updated_by_admin_id: admin.id,
          delivery_at: new Date().toISOString(),
        } satisfies IShoppingMallShipment.IUpdate,
      });
    },
  );

  // 7. Switch to seller and try admin-only update field (should fail)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  await TestValidator.error(
    "seller forbidden to update with admin-only field",
    async () => {
      await api.functional.shoppingMall.admin.shipments.update(connection, {
        shipmentId: sellerShipment.id,
        body: {
          updated_by_admin_id: admin.id, // forbidden for seller to specify
        } satisfies IShoppingMallShipment.IUpdate,
      });
    },
  );
}
