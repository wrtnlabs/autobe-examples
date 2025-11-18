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

export async function test_api_seller_update_shipment_header_forbidden_for_non_owner_seller(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.join.example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.login.example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Admin creates country and region
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
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

  // 3. Admin creates SKU inventory state (purchasable)
  const skuInventoryStateCreateBody = {
    code: "purchasable",
    name: "Purchasable",
    description: "Default purchasable state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 4. Admin creates category
  const categoryCreateBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 5. Admin creates shipping method
  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping method",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 6. Admin creates payment method
  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Credit card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 7. Seller A joins and logs in
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: "SellerAPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://sellerA.join.example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/sellerA" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAJoined);

  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://sellerA.login.example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/sellerA/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoggedIn);

  // 8. Seller A creates product
  const productCreateBody = {
    code: "product-a",
    title: "Product A",
    summary: "Product A summary",
    description: "Product A description",
    brand: "BrandA",
    model_name: "ModelA",
    status: "active",
    primary_image_uri: "https://example.com/product-a.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(productA);

  // 9. Admin logs in again (to link category)
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInAgain);

  // 10. Admin links product to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 11. Seller A logs in again and creates SKU under productA
  const sellerALoggedInForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoggedInForSku);

  const skuCreateBody = {
    code: "sku-a",
    barcode: "1234567890123",
    status: "active",
    price: 10000,
    original_price: 12000,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(skuA);

  // 12. Seller B joins and logs in (no products)
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: "SellerBPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://sellerB.join.example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/sellerB" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBJoined);

  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://sellerB.login.example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/sellerB/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoggedIn);

  // 13. Customer joins and logs in
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.join.example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/customer" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoined);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.login.example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/customer/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 14. Customer creates cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 15. Customer creates address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Customer Recipient",
    line1: "123 Test Street",
    line2: "Apt 101",
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerJoined.id,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 16. Customer adds cart item with SKU A
  const cartItemCreateBody = {
    shopping_mall_sku_id: skuA.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  // 17. Customer creates order from cart
  const orderItemsCreate: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: skuA.id,
      quantity: 1 as number & tags.Type<"int32">,
    },
  ];

  const orderShippingAddressSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: customerAddress.recipient_name,
      phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: customerAddress.postal_code,
      state_or_region: region.name_en,
      city: customerAddress.city,
      address_line1: customerAddress.line1,
      address_line2: customerAddress.line2 ?? null,
    };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: orderItemsCreate,
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: orderShippingAddressSnapshotCreate,
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

  // 18. Customer attaches order shipping address snapshot (explicit API)
  const orderShippingAddressCreateBody = {
    recipient_name: orderShippingAddressSnapshotCreate.recipient_name,
    line1: orderShippingAddressSnapshotCreate.address_line1,
    line2: orderShippingAddressSnapshotCreate.address_line2,
    city: orderShippingAddressSnapshotCreate.city,
    postal_code: orderShippingAddressSnapshotCreate.postal_code,
    country_code: orderShippingAddressSnapshotCreate.country_code as string &
      tags.MinLength<2> &
      tags.MaxLength<2>,
    region: orderShippingAddressSnapshotCreate.state_or_region,
    phone_number: orderShippingAddressSnapshotCreate.phone_number,
  } satisfies IShoppingMallOrderShippingAddress.ICreate;

  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode,
        body: orderShippingAddressCreateBody,
      },
    );
  typia.assert(orderShippingAddress);

  // 19. Admin logs in again to create shipment
  const adminLoggedInForShipment: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInForShipment);

  // Build shipment items from order.items (use all items with quantity 1)
  const shipmentItems: IShoppingMallShipmentItem.ICreate[] = order.items.map(
    (oi) =>
      ({
        shopping_mall_order_item_id: oi.id,
        shopping_mall_sku_id: oi.sku.id,
        quantity: oi.quantity as number & tags.Type<"int32"> & tags.Minimum<1>,
      }) satisfies IShoppingMallShipmentItem.ICreate,
  );

  const shipmentCreateBody = {
    orderCode,
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "pending",
    carrierName: null,
    trackingNumber: null,
    expectedShipDate: null,
    shipmentItems,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: shipmentCreateBody,
      },
    );
  typia.assert(shipment);

  const shipmentCode: string = shipment.shipment_code;

  // 20. Seller B attempts to update shipment header (should fail)
  const sellerBLoggedInForUpdate: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoggedInForUpdate);

  const sellerBUpdateBody: IShoppingMallShipment.IUpdate = {
    shippingStatus: "shipped",
    carrierName: "CarrierB",
    trackingNumber: "B-TRACK-123",
    expectedShipDate: new Date().toISOString() as string &
      tags.Format<"date-time">,
    shippedAt: new Date().toISOString() as string & tags.Format<"date-time">,
    deliveredAt: null,
  };

  await TestValidator.error(
    "non-owner seller must not be able to update shipment header",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.update(
        connection,
        {
          orderCode,
          shipmentCode,
          body: sellerBUpdateBody,
        },
      );
    },
  );

  // 21. Seller A successfully updates shipment header
  const sellerALoggedInForUpdate: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoggedInForUpdate);

  const sellerAUpdateBody: IShoppingMallShipment.IUpdate = {
    shippingStatus: "shipped",
    carrierName: "CarrierA",
    trackingNumber: "A-TRACK-999",
    expectedShipDate: new Date().toISOString() as string &
      tags.Format<"date-time">,
    shippedAt: new Date().toISOString() as string & tags.Format<"date-time">,
    deliveredAt: null,
  };

  const updatedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      connection,
      {
        orderCode,
        shipmentCode,
        body: sellerAUpdateBody,
      },
    );
  typia.assert(updatedShipment);

  TestValidator.equals(
    "shipping status must be updated by owner seller",
    updatedShipment.shipping_status,
    sellerAUpdateBody.shippingStatus,
  );
  TestValidator.equals(
    "carrier name must be updated by owner seller",
    updatedShipment.carrier_name,
    sellerAUpdateBody.carrierName,
  );
  TestValidator.equals(
    "tracking number must be updated by owner seller",
    updatedShipment.tracking_number,
    sellerAUpdateBody.trackingNumber,
  );
  TestValidator.equals(
    "expected ship date must be updated by owner seller",
    updatedShipment.expected_ship_date,
    sellerAUpdateBody.expectedShipDate,
  );
  TestValidator.equals(
    "shipped at must be updated by owner seller",
    updatedShipment.shipped_at,
    sellerAUpdateBody.shippedAt,
  );
  TestValidator.equals(
    "delivered at must be updated by owner seller",
    updatedShipment.delivered_at,
    sellerAUpdateBody.deliveredAt,
  );
}
