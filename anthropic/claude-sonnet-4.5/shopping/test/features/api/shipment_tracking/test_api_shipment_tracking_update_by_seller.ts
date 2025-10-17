import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the shipment tracking update workflow where a seller modifies shipment
 * information after initial creation.
 *
 * This test validates the complete order fulfillment and shipment tracking
 * lifecycle, ensuring sellers can update shipment information with proper
 * authorization and validation. The workflow includes seller registration,
 * product creation, customer registration, order placement, initial shipment
 * creation, and shipment updates.
 *
 * Steps:
 *
 * 1. Register seller account with business information
 * 2. Create product category as admin
 * 3. Seller creates product listing
 * 4. Seller adds SKU variant to product
 * 5. Register customer account
 * 6. Customer creates delivery address
 * 7. Customer creates payment method
 * 8. Customer adds product to cart
 * 9. Customer places order
 * 10. Re-authenticate as seller
 * 11. Seller creates initial shipment with tracking
 * 12. Seller updates shipment tracking information
 * 13. Validate updated shipment reflects changes
 */
export async function test_api_shipment_tracking_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: `${RandomGenerator.alphaNumeric(5)} ${RandomGenerator.name(2)} Street`,
      tax_id: RandomGenerator.alphaNumeric(9),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 4: Seller adds SKU variant
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 5: Register customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 6: Customer creates delivery address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: `${RandomGenerator.alphaNumeric(4)} ${RandomGenerator.name(2)} Avenue`,
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 7: Customer creates payment method
  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: RandomGenerator.pick([
            "credit_card",
            "debit_card",
            "paypal",
          ] as const),
          gateway_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 8: Customer adds product to cart
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 9: Customer places order
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: RandomGenerator.pick([
          "standard",
          "express",
          "overnight",
        ] as const),
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  TestValidator.predicate(
    "order creation should return order IDs",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];

  // Step 10: Re-authenticate as seller for shipment operations
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: seller.business_name,
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.name(3),
      tax_id: RandomGenerator.alphaNumeric(9),
    } satisfies IShoppingMallSeller.ICreate,
  });

  // Step 11: Seller creates initial shipment
  const initialCarrier = RandomGenerator.pick([
    "FedEx",
    "UPS",
    "USPS",
    "DHL",
  ] as const);
  const initialTrackingNumber = `${RandomGenerator.alphaNumeric(12).toUpperCase()}`;

  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    connection,
    {
      body: {
        shopping_mall_order_id: orderId,
        carrier_name: initialCarrier,
        tracking_number: initialTrackingNumber,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);

  TestValidator.equals(
    "initial tracking number should match",
    shipment.tracking_number,
    initialTrackingNumber,
  );

  // Step 12: Seller updates shipment with corrected tracking information
  const updatedCarrier = RandomGenerator.pick([
    "FedEx",
    "UPS",
    "USPS",
    "DHL",
  ] as const);
  const updatedTrackingNumber = `${RandomGenerator.alphaNumeric(12).toUpperCase()}`;
  const updatedShippingMethod = RandomGenerator.pick([
    "standard",
    "express",
    "overnight",
  ] as const);
  const updatedStatus = RandomGenerator.pick([
    "label_created",
    "picked_up",
    "in_transit",
    "out_for_delivery",
  ] as const);
  const estimatedDeliveryDate = RandomGenerator.date(
    new Date(),
    7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.update(connection, {
      shipmentId: shipment.id,
      body: {
        carrier_name: updatedCarrier,
        tracking_number: updatedTrackingNumber,
        shipping_method: updatedShippingMethod,
        shipment_status: updatedStatus,
        estimated_delivery_date: estimatedDeliveryDate,
        actual_delivery_date: null,
        delivery_signature: null,
      } satisfies IShoppingMallShipment.IUpdate,
    });
  typia.assert(updatedShipment);

  // Step 13: Validate updated shipment
  TestValidator.equals(
    "updated tracking number should match",
    updatedShipment.tracking_number,
    updatedTrackingNumber,
  );

  TestValidator.predicate(
    "shipment ID should remain unchanged",
    updatedShipment.id === shipment.id,
  );
}
