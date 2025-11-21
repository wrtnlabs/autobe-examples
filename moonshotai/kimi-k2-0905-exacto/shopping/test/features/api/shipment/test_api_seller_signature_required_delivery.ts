import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller's management of high-value shipments requiring signature
 * confirmation.
 *
 * This comprehensive E2E test validates signature requirement workflows for
 * high-value orders using only the available API functions for delivery
 * management, signature confirmation, and secure shipment processing.
 *
 * Test Flow:
 *
 * 1. Create seller account for shipment management
 * 2. Create high-value product requiring signature (>$500)
 * 3. Create initial shipment record with signature requirement
 * 4. Update shipment with delivery proof and signature confirmation
 * 5. Test failed signature attempt workflows
 * 6. Validate package holding procedures for undeliverable items
 * 7. Test recipient verification and security protocols
 */
export async function test_api_seller_signature_required_delivery(
  connection: api.IConnection,
) {
  // 1. Create authenticated seller account for secure delivery management
  const sellerEmail = `${RandomGenerator.alphabets(8)}@business.com`;
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: `${RandomGenerator.name()} Electronics GmbH`,
      business_registration_number: `REG-${RandomGenerator.alphabets(10)}`,
      tax_id: `TAX-${RandomGenerator.alphabets(12)}`,
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create high-value product (>$500) requiring signature confirmation
  const highValueProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `SKU-HV${RandomGenerator.alphabets(8)}`,
        name: `${RandomGenerator.name()} Premium Electronics Bundle`,
        description: RandomGenerator.content({
          paragraphs: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        price: 750.0, // >$500 threshold for signature requirement
        condition: "new",
        weight: 2.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: seller.id,
        shopping_mall_seller_id: seller.id,
        href: "https://seller.test.com/product/create",
        referrer: "https://seller.test.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(highValueProduct);
  TestValidator.predicate(
    "product price exceeds signature threshold",
    () => highValueProduct.price >= 500.0,
  );

  // 3. Test shipment creation with signature requirement for high-value order
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const signatureShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderId: orderId,
        body: {
          carrier: "FedEx",
          service_level: "expedited",
          weight: 2.8,
          dimensions: "12x8x6",
          shipping_cost: 35.0,
          tracking_number: `TRK${RandomGenerator.alphabets(15)}`,
          estimated_delivery_date: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          requires_signature: true, // ✅ Active signature requirement for high-value shipment
          tracking_status: "pre_transit",
          is_consolidated: false,
        } satisfies IShoppingMallOrderShipment.ICreate,
      },
    );
  typia.assert(signatureShipment);
  TestValidator.predicate(
    "signature requirement activated for high-value shipment",
    () => signatureShipment.requires_signature === true,
  );

  // 4. Update shipment with successful delivery proof and signature confirmation
  const deliveredShipment =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderId: orderId,
        shipmentId: signatureShipment.id,
        body: {
          tracking_status: "delivered",
          delivered_date: new Date(
            Date.now() - 2 * 60 * 60 * 1000,
          ).toISOString(), // 2 hours ago
          delivery_proof: `RELEASED_TO_CUSTOMER_WITH_SIGNATURE_${RandomGenerator.alphabets(10)}`,
          last_status_message:
            "Package successfully delivered with signature confirmation",
          ip: "192.168.1.100",
          href: "https://seller.test.com/shipments/confirm-delivery",
          referrer: "https://seller.test.com/orders/track",
        } satisfies IShoppingMallOrderShipment.IUpdate,
      },
    );
  typia.assert(deliveredShipment);
  TestValidator.predicate(
    "successful signature confirmation documented",
    () =>
      deliveredShipment.delivered_date !== null &&
      deliveredShipment.delivery_proof !== null &&
      deliveredShipment.tracking_status === "delivered",
  );

  // 5. Test delayed signature confirmation workflow
  const delayedShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderId: orderId,
        body: {
          carrier: "UPS",
          service_level: "standard",
          weight: 3.2,
          dimensions: "15x10x8",
          shipping_cost: 28.0,
          tracking_number: `UPS${RandomGenerator.alphabets(12)}`,
          estimated_delivery_date: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          requires_signature: true,
          tracking_status: "pre_transit",
          is_consolidated: false,
        } satisfies IShoppingMallOrderShipment.ICreate,
      },
    );
  typia.assert(delayedShipment);

  const signatureDelayedShipment =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderId: orderId,
        shipmentId: delayedShipment.id,
        body: {
          tracking_status: "out_for_delivery",
          delay_reason: "scheduled_signature_required",
          last_status_message:
            "Delivery scheduled for signature confirmation - customer contact required",
          delivery_proof: null,
          delivered_date: null,
          ip: "192.168.1.100",
          href: "https://seller.test.com/shipments/schedule-signature",
          referrer: "https://seller.test.com/orders/signature-tracking",
        } satisfies IShoppingMallOrderShipment.IUpdate,
      },
    );
  typia.assert(signatureDelayedShipment);
  TestValidator.predicate(
    "delayed signature workflow properly documented",
    () =>
      signatureDelayedShipment.delay_reason ===
        "scheduled_signature_required" &&
      signatureDelayedShipment.tracking_status === "out_for_delivery",
  );

  // 6. Test exception handling for signature verification issues
  const exceptionShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderId: orderId,
        body: {
          carrier: "DHL",
          service_level: "overnight",
          weight: 1.8,
          dimensions: "8x6x4",
          shipping_cost: 45.0,
          tracking_number: `DHL${RandomGenerator.alphabets(12)}`,
          estimated_delivery_date: new Date(
            Date.now() + 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          requires_signature: true,
          tracking_status: "pre_transit",
          is_consolidated: false,
        } satisfies IShoppingMallOrderShipment.ICreate,
      },
    );
  typia.assert(exceptionShipment);

  const signatureExceptionShipment =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderId: orderId,
        shipmentId: exceptionShipment.id,
        body: {
          tracking_status: "exception",
          delay_reason: "recipient_verification_failed",
          last_status_message:
            "Signature verification required - Recipient identity confirmation failed",
          delivery_proof: null,
          delivered_date: null,
          ip: "192.168.1.100",
          href: "https://seller.test.com/shipments/exception-handling",
          referrer: "https://seller.test.com/orders/verification",
        } satisfies IShoppingMallOrderShipment.IUpdate,
      },
    );
  typia.assert(signatureExceptionShipment);
  TestValidator.predicate(
    "signature exception properly handled with verification failure",
    () =>
      signatureExceptionShipment.tracking_status === "exception" &&
      signatureExceptionShipment.delay_reason ===
        "recipient_verification_failed",
  );

  // 7. Validate comprehensive signature requirement security workflows
  const securityTestShipment =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderId: orderId,
        shipmentId: deliveredShipment.id,
        body: {
          tracking_status: "picked_up",
          picked_up_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          last_status_message:
            "High-value shipment picked up with enhanced security protocols",
          carrier: "FedEx Security Plus",
          shipping_cost: 55.0,
          service_level: "secure_signature_required",
          ip: "192.168.1.101",
          href: "https://seller.test.com/shipments/security-update",
          referrer: "https://seller.test.com/orders/security-dashboard",
        } satisfies IShoppingMallOrderShipment.IUpdate,
      },
    );
  typia.assert(securityTestShipment);

  TestValidator.predicate(
    "enhanced security protocols documented for high-value shipments",
    () =>
      securityTestShipment.picked_up_at !== null &&
      securityTestShipment.tracking_status === "picked_up" &&
      securityTestShipment.service_level === "secure_signature_required",
  );

  // Comprehensive validation of signature requirement business rules
  TestValidator.predicate(
    "all signature-required shipments have mandatory security protocols",
    () =>
      deliveredShipment.requires_signature === true &&
      signatureDelayedShipment.requires_signature === true &&
      signatureExceptionShipment.requires_signature === true &&
      securityTestShipment.requires_signature === true,
  );

  TestValidator.predicate(
    "delivery proof required for signated shipments upon delivery",
    () =>
      deliveredShipment.delivered_date !== null &&
      deliveredShipment.delivery_proof !== null,
  );

  TestValidator.predicate(
    "signature delays properly documented for recipient verification",
    () =>
      signatureDelayedShipment.delay_reason === "scheduled_signature_required",
  );

  TestValidator.predicate(
    "signature verification failures trigger proper exception handling",
    () =>
      signatureExceptionShipment.tracking_status === "exception" &&
      signatureExceptionShipment.delay_reason ===
        "recipient_verification_failed",
  );
}
