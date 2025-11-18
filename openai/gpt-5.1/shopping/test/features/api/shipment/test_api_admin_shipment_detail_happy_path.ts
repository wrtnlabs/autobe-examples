import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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

export async function test_api_admin_shipment_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin onboarding and base configuration (countries, regions, sku inventory state, shipping method, payment method, category)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com` as string &
      tags.Format<"email">,
    password: "Admin#1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${countryCode}`,
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "R1",
    name_en: "Region 1",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  const skuInventoryStateBody = {
    code: `state_${RandomGenerator.alphabets(5)}`,
    name: "Purchasable",
    description: "State allowing purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuInventoryState);

  const shippingMethodBody = {
    method_code: `method_${RandomGenerator.alphabets(5)}`,
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: `pay_${RandomGenerator.alphabets(5)}`,
    display_name: "Credit Card",
    description: "Standard credit card payment",
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

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(5)}`,
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 2. Seller onboarding and catalog creation (product, SKU, product-category link)
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com` as string &
      tags.Format<"email">,
    password: "Seller#1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.test/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const productBody = {
    code: `prod_${RandomGenerator.alphabets(6)}`,
    title: "Test Product",
    summary: "Short summary",
    description: "Detailed description",
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  const skuBody = {
    code: `sku_${RandomGenerator.alphabets(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 3. Customer onboarding, cart and order creation
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com` as string &
      tags.Format<"email">,
    password: "Customer#1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.test/join" as string & tags.Format<"uri">,
    referrer: "https://shop.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.test/login" as string & tags.Format<"uri">,
    referrer: "https://shop.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

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

  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Main St",
    line2: "Apt 1",
    city: "Metropolis",
    postal_code: "12345",
    phone_number: "010-0000-0000",
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLoggedIn.id,
        body: customerAddressBody,
      },
    );
  typia.assert(customerAddress);

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
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

  const orderShippingAddressBody = {
    recipient_name: customerAddress.recipient_name,
    line1: customerAddress.line1,
    line2: customerAddress.line2,
    city: customerAddress.city,
    postal_code: customerAddress.postal_code,
    country_code: country.country_code as string &
      tags.MinLength<2> &
      tags.MaxLength<2>,
    region: null,
    phone_number: customerAddress.phone_number,
  } satisfies IShoppingMallOrderShippingAddress.ICreate;
  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: orderShippingAddressBody,
      },
    );
  typia.assert(orderShippingAddress);

  // 4. Admin: create shipment for the order
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const shipmentItemsBody: IShoppingMallShipmentItem.ICreate[] = [
    {
      shopping_mall_order_item_id: order.items[0].id,
      shopping_mall_sku_id: order.items[0].sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    },
  ];

  const expectedShipDate = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const shipmentCreateBody = {
    orderCode: order.order_code,
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "shipped",
    carrierName: "TestCarrier",
    trackingNumber: RandomGenerator.alphaNumeric(12),
    expectedShipDate,
    shipmentItems: shipmentItemsBody,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: order.order_code,
        body: shipmentCreateBody,
      },
    );
  typia.assert(shipment);

  // 5. Admin: retrieve shipment details via GET /shoppingMall/admin/orders/{orderCode}/shipments/{shipmentCode}
  const reloaded: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.at(connection, {
      orderCode: order.order_code,
      shipmentCode: shipment.shipment_code,
    });
  typia.assert(reloaded);

  // Assertions on shipment header fields
  TestValidator.equals(
    "shipment_code should match",
    reloaded.shipment_code,
    shipment.shipment_code,
  );
  TestValidator.equals(
    "shipping_status should match",
    reloaded.shipping_status,
    shipmentCreateBody.shippingStatus,
  );
  TestValidator.equals(
    "carrier_name should match",
    reloaded.carrier_name,
    shipmentCreateBody.carrierName,
  );
  TestValidator.equals(
    "tracking_number should match",
    reloaded.tracking_number,
    shipmentCreateBody.trackingNumber,
  );
  TestValidator.equals(
    "expected_ship_date should match",
    reloaded.expected_ship_date,
    expectedShipDate,
  );

  // Order summary consistency
  if (reloaded.order !== undefined) {
    TestValidator.equals(
      "order_code in shipment.order should match",
      reloaded.order.order_code,
      order.order_code,
    );
    TestValidator.equals(
      "currency_code in shipment.order should match",
      reloaded.order.currency_code,
      order.currency_code,
    );
    TestValidator.predicate(
      "grand_total_amount should be positive",
      reloaded.order.grand_total_amount > 0,
    );
  }

  // Seller summary
  if (reloaded.seller !== undefined) {
    TestValidator.equals(
      "shipment.seller.id should equal seller id",
      reloaded.seller.id,
      sellerAuthorized.id,
    );
  }

  // Shipping method summary
  if (reloaded.shipping_method !== undefined) {
    TestValidator.equals(
      "shipping method id should match",
      reloaded.shipping_method.id,
      shippingMethod.id,
    );
    TestValidator.equals(
      "shipping method code should match",
      reloaded.shipping_method.method_code,
      shippingMethod.method_code,
    );
    TestValidator.equals(
      "shipping method display name should match",
      reloaded.shipping_method.display_name,
      shippingMethod.display_name,
    );
  }

  // Shipping address snapshot consistency
  if (reloaded.shipping_address !== undefined) {
    TestValidator.equals(
      "shipping recipient_name should match snapshot",
      reloaded.shipping_address.recipient_name,
      orderShippingAddress.recipient_name,
    );
    TestValidator.equals(
      "shipping line1 should match snapshot",
      reloaded.shipping_address.line1,
      orderShippingAddress.line1,
    );
    TestValidator.equals(
      "shipping line2 should match snapshot",
      reloaded.shipping_address.line2,
      orderShippingAddress.line2,
    );
    TestValidator.equals(
      "shipping city should match snapshot",
      reloaded.shipping_address.city,
      orderShippingAddress.city,
    );
    TestValidator.equals(
      "shipping postal_code should match snapshot",
      reloaded.shipping_address.postal_code,
      orderShippingAddress.postal_code,
    );
    TestValidator.equals(
      "shipping country_code should match snapshot",
      reloaded.shipping_address.country_code,
      orderShippingAddress.country_code,
    );
    TestValidator.equals(
      "shipping region should match snapshot",
      reloaded.shipping_address.region,
      orderShippingAddress.region,
    );
    TestValidator.equals(
      "shipping phone_number should match snapshot",
      reloaded.shipping_address.phone_number,
      orderShippingAddress.phone_number,
    );
  }

  // Shipment items linkage and quantity sanity check
  const quantityByOrderItem = new Map<string, number>();
  for (const item of reloaded.items ?? []) {
    TestValidator.predicate(
      "shipment item quantity must be > 0",
      item.quantity > 0,
    );

    const matchedOrderItem = order.items.find(
      (oi) => oi.id === item.shopping_mall_order_item_id,
    );
    TestValidator.predicate(
      "shipment item should reference existing order item",
      matchedOrderItem !== undefined,
    );
    if (matchedOrderItem !== undefined) {
      TestValidator.equals(
        "shipment item sku should match order item's sku",
        item.shopping_mall_sku_id,
        matchedOrderItem.sku.id,
      );
      const prev = quantityByOrderItem.get(matchedOrderItem.id) ?? 0;
      quantityByOrderItem.set(matchedOrderItem.id, prev + item.quantity);
    }
  }

  for (const oi of order.items) {
    const shippedQty = quantityByOrderItem.get(oi.id) ?? 0;
    TestValidator.predicate(
      "shipped quantity for an order item must not exceed ordered quantity",
      shippedQty <= oi.quantity,
    );
  }
}
