import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate seller-scoped shipment listing visibility for multi-seller orders.
 *
 * This test:
 *
 * - Creates Seller A and Seller B, each with their own product and SKU.
 * - Creates an admin for catalog and shipment configuration.
 * - Creates a customer, address, country/region, shipping method, payment method,
 *   and inventory state.
 * - Creates an order that includes line items for both Seller A’s and Seller B’s
 *   SKUs.
 * - As admin, creates three shipments via
 *   /shoppingMall/admin/orders/{orderCode}/shipments:
 *
 *   - S1: shipment containing only Seller A’s order item.
 *   - S2: shipment containing only Seller B’s order item.
 *   - S3: shipment containing both Seller A and Seller B order items.
 * - As Seller A, lists shipments for the order via PATCH
 *   /shoppingMall/seller/orders/{orderCode}/shipments and asserts:
 *
 *   - S1 and S3 are present.
 *   - S2 is not present.
 * - As Seller B, lists shipments for the same orderCode and asserts:
 *
 *   - S2 and S3 are present.
 *   - S1 is not present.
 */
export async function test_api_seller_order_shipments_multi_seller_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create customer and login
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 3. Create Seller A and Seller B
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuthorized);

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerBAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuthorized);

  // 4. As admin, create country and region
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 5. Customer shipping address under that country/region
  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "Los Angeles",
    postal_code: "90001",
    phone_number: RandomGenerator.mobile("+1"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: customerAddressBody,
      },
    );
  typia.assert(customerAddress);

  // 6. Admin shipping method and payment method
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card processor",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 7. Admin SKU inventory state
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Regular in-stock items",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 8. Seller A product & SKU
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerALoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoggedIn);

  const productABody = {
    code: "PROD-A-" + RandomGenerator.alphaNumeric(6),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandA",
    model_name: "ModelA",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  const skuABody = {
    code: "SKU-A-" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: skuABody,
    });
  typia.assert(skuA);

  // 9. Seller B product & SKU
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerBLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoggedIn);

  const productBBody = {
    code: "PROD-B-" + RandomGenerator.alphaNumeric(6),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandB",
    model_name: "ModelB",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  const skuBBody = {
    code: "SKU-B-" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 150,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id,
      body: skuBBody,
    });
  typia.assert(skuB);

  // 10. Customer creates cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 11. Customer creates order including both SKUs
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: skuA.id,
        quantity: 1,
      },
      {
        shopping_mall_sku_id: skuB.id,
        quantity: 1,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  const orderCode: string = order.order_code;

  // 12. Customer creates shipping address snapshot for the order
  const orderShippingAddressBody = {
    recipient_name: customerAddress.recipient_name,
    line1: customerAddress.line1,
    line2: customerAddress.line2 ?? null,
    city: customerAddress.city,
    postal_code: customerAddress.postal_code,
    country_code: "US" as string & tags.MinLength<2> & tags.MaxLength<2>,
    region: "CA",
    phone_number: customerAddress.phone_number ?? null,
  } satisfies IShoppingMallOrderShippingAddress.ICreate;
  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode,
        body: orderShippingAddressBody,
      },
    );
  typia.assert(orderShippingAddress);

  // Helper: find order items for each SKU
  const orderItemForSku = (skuId: string): IShoppingMallOrderItem => {
    const found = order.items.find((item) => item.sku.id === skuId);
    if (!found) throw new Error("Order item for SKU not found");
    return found;
  };
  const orderItemA: IShoppingMallOrderItem = orderItemForSku(skuA.id);
  const orderItemB: IShoppingMallOrderItem = orderItemForSku(skuB.id);

  // 13. Admin creates shipments S1 (A only), S2 (B only), S3 (both)
  const expectedShipDate: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  // Shipment S1: only Seller A item
  const shipmentS1Body = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "preparing",
    carrierName: "CarrierX",
    trackingNumber: null,
    expectedShipDate,
    shipmentItems: [
      {
        shopping_mall_order_item_id: orderItemA.id,
        shopping_mall_sku_id: skuA.id,
        quantity: 1,
      },
    ] satisfies IShoppingMallShipmentItem.ICreate[],
  } satisfies IShoppingMallShipment.ICreate;
  const shipmentS1: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: shipmentS1Body,
      },
    );
  typia.assert(shipmentS1);

  // Shipment S2: only Seller B item
  const shipmentS2Body = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "preparing",
    carrierName: "CarrierY",
    trackingNumber: null,
    expectedShipDate,
    shipmentItems: [
      {
        shopping_mall_order_item_id: orderItemB.id,
        shopping_mall_sku_id: skuB.id,
        quantity: 1,
      },
    ] satisfies IShoppingMallShipmentItem.ICreate[],
  } satisfies IShoppingMallShipment.ICreate;
  const shipmentS2: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: shipmentS2Body,
      },
    );
  typia.assert(shipmentS2);

  // Shipment S3: shared, both A and B items
  const shipmentS3Body = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "preparing",
    carrierName: "CarrierZ",
    trackingNumber: null,
    expectedShipDate,
    shipmentItems: [
      {
        shopping_mall_order_item_id: orderItemA.id,
        shopping_mall_sku_id: skuA.id,
        quantity: 1,
      },
      {
        shopping_mall_order_item_id: orderItemB.id,
        shopping_mall_sku_id: skuB.id,
        quantity: 1,
      },
    ] satisfies IShoppingMallShipmentItem.ICreate[],
  } satisfies IShoppingMallShipment.ICreate;
  const shipmentS3: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: shipmentS3Body,
      },
    );
  typia.assert(shipmentS3);

  // Collect shipment codes for later visibility checks
  const s1Code: string = shipmentS1.shipment_code;
  const s2Code: string = shipmentS2.shipment_code;
  const s3Code: string = shipmentS3.shipment_code;

  // 14. As Seller A, list shipments for this order
  const sellerALoginAgainBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerALoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginAgainBody,
    });
  typia.assert(sellerALoginAgain);

  const sellerAListReq = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "asc" as const,
    shipment_code: undefined,
    shipping_statuses: undefined,
    carrier_name: undefined,
    tracking_number: undefined,
    created_from: undefined,
    created_to: undefined,
    shipped_from: undefined,
    shipped_to: undefined,
    delivered_from: undefined,
    delivered_to: undefined,
  } satisfies IShoppingMallShipment.IRequest;
  const sellerAList: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderCode,
        body: sellerAListReq,
      },
    );
  typia.assert(sellerAList);

  const sellerAShipmentCodes = sellerAList.data.map((s) => s.shipment_code);

  TestValidator.predicate(
    "Seller A should see S1",
    sellerAShipmentCodes.includes(s1Code),
  );
  TestValidator.predicate(
    "Seller A should see shared shipment S3",
    sellerAShipmentCodes.includes(s3Code),
  );
  TestValidator.predicate(
    "Seller A should not see Seller B only shipment S2",
    !sellerAShipmentCodes.includes(s2Code),
  );

  // 15. As Seller B, list shipments for this order
  const sellerBLoginAgainBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerBLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginAgainBody,
    });
  typia.assert(sellerBLoginAgain);

  const sellerBListReq = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "asc" as const,
    shipment_code: undefined,
    shipping_statuses: undefined,
    carrier_name: undefined,
    tracking_number: undefined,
    created_from: undefined,
    created_to: undefined,
    shipped_from: undefined,
    shipped_to: undefined,
    delivered_from: undefined,
    delivered_to: undefined,
  } satisfies IShoppingMallShipment.IRequest;
  const sellerBList: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderCode,
        body: sellerBListReq,
      },
    );
  typia.assert(sellerBList);

  const sellerBShipmentCodes = sellerBList.data.map((s) => s.shipment_code);

  TestValidator.predicate(
    "Seller B should see S2",
    sellerBShipmentCodes.includes(s2Code),
  );
  TestValidator.predicate(
    "Seller B should see shared shipment S3",
    sellerBShipmentCodes.includes(s3Code),
  );
  TestValidator.predicate(
    "Seller B should not see Seller A only shipment S1",
    !sellerBShipmentCodes.includes(s1Code),
  );
}
