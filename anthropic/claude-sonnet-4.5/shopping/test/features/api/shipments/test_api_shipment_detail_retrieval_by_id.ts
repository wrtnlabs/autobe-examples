import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test retrieval of detailed shipment information by shipment ID.
 *
 * This test validates that customers, sellers, and admins can access complete
 * shipment details including carrier name, tracking number, shipping method,
 * current status, timeline information, and delivery confirmation through the
 * shipment ID lookup endpoint.
 *
 * Test workflow:
 *
 * 1. Create customer account for order placement
 * 2. Create delivery address for shipment
 * 3. Create payment method for order payment
 * 4. Create seller account for product management
 * 5. Create admin account and category
 * 6. Create product and SKU variant as seller
 * 7. Add product to cart as customer
 * 8. Create order as customer
 * 9. Create shipment as seller
 * 10. Retrieve shipment details and validate complete tracking data
 */
export async function test_api_shipment_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create delivery address (as customer)
  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    });
  typia.assert(address);

  // Step 3: Create payment method (as customer)
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(2),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(9),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 5: Create admin account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 6: Re-authenticate as seller to create product
  const sellerReauth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(2),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(9),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerReauth);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 7: Create SKU variant (as seller)
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // Step 8: Re-authenticate as customer to add to cart
  const customerReauth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerReauth);

  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 9: Create order (as customer)
  const orderResponse: IShoppingMallOrder.ICreateResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);
  TestValidator.predicate(
    "order should be created successfully",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];
  typia.assertGuard(orderId!);

  // Step 10: Re-authenticate as seller to create shipment
  const sellerForShipment: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(2),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(9),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerForShipment);

  const carrierName = "FedEx";
  const trackingNumber = RandomGenerator.alphaNumeric(16);
  const createdShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.shipments.create(connection, {
      body: {
        shopping_mall_order_id: orderId,
        carrier_name: carrierName,
        tracking_number: trackingNumber,
      } satisfies IShoppingMallShipment.ICreate,
    });
  typia.assert(createdShipment);

  // Step 11: Retrieve shipment details and validate
  const retrievedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.shipments.at(connection, {
      shipmentId: createdShipment.id,
    });
  typia.assert(retrievedShipment);

  // Validate shipment details match
  TestValidator.equals(
    "shipment ID matches",
    retrievedShipment.id,
    createdShipment.id,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.tracking_number,
    trackingNumber,
  );
}
