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
 * Test the complete order fulfillment workflow where a seller creates a
 * shipment record after receiving and preparing a customer order.
 *
 * This test validates the end-to-end shipment creation process by following a
 * realistic e-commerce order fulfillment flow: seller creates product, customer
 * places order, seller ships the order with tracking information.
 *
 * Workflow Steps:
 *
 * 1. Seller authenticates and creates a product category
 * 2. Seller creates a product and SKU variant
 * 3. Customer authenticates and sets up delivery address
 * 4. Customer sets up payment method
 * 5. Customer adds product to cart and places order
 * 6. Seller creates shipment record with tracking information
 * 7. Validate shipment record contains correct order ID, carrier, and tracking
 *    number
 */
export async function test_api_shipment_creation_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Seller authenticates
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

  // Step 3: Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 4: Seller creates SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 5: Customer authenticates (switches authentication context)
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
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

  // Step 8: Customer adds product to cart (using a generated cart ID)
  const customerCartId = typia.random<string & tags.Format<"uuid">>();

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: customerCartId,
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
    "order creation should return at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  // Step 10: Extract the first order ID for shipment creation
  const orderId = orderResponse.order_ids[0];
  typia.assert(orderId);

  // Step 11: Switch back to seller context by re-authenticating
  const sellerReauth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: seller.business_name,
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
  typia.assert(sellerReauth);

  // Step 12: Seller creates shipment with tracking information
  const trackingNumber = `TRK-${RandomGenerator.alphaNumeric(12).toUpperCase()}`;
  const carrierName = RandomGenerator.pick([
    "FedEx",
    "UPS",
    "USPS",
    "DHL",
  ] as const);

  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    connection,
    {
      body: {
        shopping_mall_order_id: orderId,
        carrier_name: carrierName,
        tracking_number: trackingNumber,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);

  // Step 13: Validate shipment record
  TestValidator.equals(
    "shipment tracking number should match the provided tracking number",
    shipment.tracking_number,
    trackingNumber,
  );

  TestValidator.predicate(
    "shipment ID should be a valid non-empty UUID",
    shipment.id.length > 0,
  );
}
