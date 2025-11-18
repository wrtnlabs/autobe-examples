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

export async function test_api_seller_shipment_erase_conflict_when_shipment_already_shipped(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer bootstrap
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}-admin@example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
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
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}-seller@example.com` as string &
      tags.Format<"email">,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const customerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}-customer@example.com` as string &
      tags.Format<"email">,
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 2. Admin config: country, region, category, inventory state, shipping/payment methods
  const countryBody = {
    country_code: RandomGenerator.alphaNumeric(2).toUpperCase(),
    name_en: "Test Country",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "TEST-REGION",
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
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

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category for shipment erase test",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "State for purchasable SKUs",
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

  const shippingMethodBody = {
    method_code: `ship_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Test Shipping",
    service_level_description: "Standard shipping for tests",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: `pay_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Test Payment",
    description: "Test payment method",
    provider_type: "test_provider",
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

  // 3. Seller catalog: product and SKU
  const productBody = {
    code: `prod_${RandomGenerator.alphaNumeric(6)}`,
    title: "Shipment Erase Test Product",
    summary: "Product used in shipment erase conflict test",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.png" as string &
      tags.Format<"uri">,
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
    code: `sku_${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Customer address and cart
  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test St",
    line2: "Suite 100",
    city: "Testville",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
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

  // 5. Customer creates order
  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  };

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // Attach explicit order shipping address snapshot
  const orderShippingAddressBody: IShoppingMallOrderShippingAddress.ICreate = {
    recipient_name: shippingSnapshot.recipient_name,
    line1: shippingSnapshot.address_line1,
    line2: shippingSnapshot.address_line2 ?? null,
    city: shippingSnapshot.city,
    postal_code: shippingSnapshot.postal_code,
    country_code: shippingSnapshot.country_code as string &
      tags.MinLength<2> &
      tags.MaxLength<2>,
    region: shippingSnapshot.state_or_region,
    phone_number: shippingSnapshot.phone_number,
  };
  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: orderShippingAddressBody,
      },
    );
  typia.assert(orderShippingAddress);

  // 7. Admin creates a shipment for the order
  const orderItem: IShoppingMallOrderItem | undefined = order.items[0];
  typia.assertGuard(orderItem!);
  const shipmentCreateBody: IShoppingMallShipment.ICreate = {
    orderCode: order.order_code,
    shippingAddressId: orderShippingAddress.id as string & tags.Format<"uuid">,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "pending",
    carrierName: null,
    trackingNumber: null,
    expectedShipDate: null,
    shipmentItems: [
      {
        shopping_mall_order_item_id: orderItem.id,
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
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

  TestValidator.equals(
    "shipment order linkage",
    shipment.order?.order_code,
    order.order_code,
  );

  // 8. Admin updates shipment to shipped status
  const shippedAt = new Date().toISOString();
  const shipmentUpdateBody: IShoppingMallShipment.IUpdate = {
    shippingStatus: "shipped",
    carrierName: "TestCarrier",
    trackingNumber: RandomGenerator.alphaNumeric(12),
    expectedShipDate: null,
    shippedAt: shippedAt as string & tags.Format<"date-time">,
    deliveredAt: null,
  };

  const shippedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.update(connection, {
      shipmentCode: shipment.shipment_code,
      body: shipmentUpdateBody,
    });
  typia.assert(shippedShipment);

  TestValidator.equals(
    "shipment status is shipped",
    shippedShipment.shipping_status,
    "shipped",
  );

  // 9. As seller, attempt to erase the shipped shipment
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  await TestValidator.error("cannot erase shipment after shipped", async () => {
    await api.functional.shoppingMall.seller.orders.shipments.erase(
      connection,
      {
        orderCode: order.order_code,
        shipmentCode: shipment.shipment_code,
      },
    );
  });
}
