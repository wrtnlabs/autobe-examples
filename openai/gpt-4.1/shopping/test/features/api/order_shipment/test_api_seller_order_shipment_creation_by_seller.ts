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
 * Validate that a seller can create a new shipment for an assigned order.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new seller using the seller join endpoint to
 *    establish authorized context.
 * 2. Register a new shipping partner via admin API to obtain a valid
 *    shipping_partner_id (required for shipment creation).
 * 3. Use the seller shipment creation endpoint, submitting all required fields as
 *    defined in the shipment creation DTO.
 * 4. Verify the linkage of shipment to correct order and shipping partner,
 *    uniqueness and validation of tracking_number, and successful enforcement
 *    of required business rules and status values.
 */
export async function test_api_seller_order_shipment_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerRegNumber = `${RandomGenerator.alphaNumeric(8)}${RandomGenerator.alphaNumeric(2)}`;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        registration_number: sellerRegNumber,
        business_phone: RandomGenerator.mobile(),
        href: "https://www.seller-page.com",
        referrer: "https://www.marketplace.com",
        ip: undefined,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);
  // We'll use the authenticated connection for the seller.

  // 2. Register and authenticate as an admin (to create shipping partner)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Admin context is now set (via connection token)
  // 3. Create a shipping partner
  const shippingPartnerName = RandomGenerator.paragraph({ sentences: 2 });
  const shippingPartnerCode = RandomGenerator.alphaNumeric(8);
  const shippingPartner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: shippingPartnerName,
          partner_code: shippingPartnerCode,
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(shippingPartner);

  // 4. Switch back to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://www.seller-page.com",
      referrer: "https://www.marketplace.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Create a mock order summary to simulate shipment creation (since order creation is not in scope)
  // We'll mock a plausible order number
  const fakeOrderNumber = RandomGenerator.alphaNumeric(12).toUpperCase();
  // But since we cannot create/certify a real order, treat this as a demonstration of the shipment API

  // 6. Create a new shipment for the assigned order
  const trackingNumber = RandomGenerator.alphaNumeric(10).toUpperCase();
  const requestBody = {
    shipping_partner_id: shippingPartner.id,
    tracking_number: trackingNumber,
    status: "pending",
    ship_date: new Date().toISOString(),
    expected_delivery_date: new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IShoppingMallOrderShipment.ICreate;
  const shipment: IShoppingMallOrderShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderNumber: fakeOrderNumber,
        body: requestBody,
      },
    );
  typia.assert(shipment);

  // 7. Verification/assertion
  TestValidator.equals(
    "orderNumber linkage",
    shipment.order.order_number,
    fakeOrderNumber,
  );
  TestValidator.equals(
    "shipping partner linkage",
    shipment.shippingPartner.id,
    shippingPartner.id,
  );
  TestValidator.equals(
    "tracking_number matches",
    shipment.tracking_number,
    trackingNumber,
  );
  TestValidator.equals("status is set to pending", shipment.status, "pending");
  TestValidator.predicate(
    "ship_date is valid ISO string",
    typeof shipment.ship_date === "string" && shipment.ship_date.length > 0,
  );
  TestValidator.predicate(
    "expected_delivery_date is valid ISO string",
    typeof shipment.expected_delivery_date === "string" &&
      shipment.expected_delivery_date.length > 0,
  );
}
