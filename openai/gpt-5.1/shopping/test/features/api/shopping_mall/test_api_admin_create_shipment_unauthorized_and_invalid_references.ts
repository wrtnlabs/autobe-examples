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

/**
 * Validate that admin shipment creation enforces authorization and reference
 * integrity.
 *
 * Business intent:
 *
 * - Only admin actors may create shipments through POST
 *   /shoppingMall/admin/orders/{orderCode}/shipments.
 * - Shipments must be created only for existing orders and must reference valid
 *   order items and SKUs.
 * - Failed unauthorized or invalid-reference attempts must not prevent a
 *   subsequent valid shipment from succeeding.
 *
 * End-to-end flow:
 *
 * 1. Create three actors via join endpoints: customer, seller, admin.
 * 2. As admin/seller, set up minimal catalog and configuration:
 *
 *    - Country and region
 *    - Category
 *    - Product and product-category link
 *    - SKU inventory state and SKU
 *    - Shipping method and payment method
 * 3. As customer, create cart, add SKU as cart item, register shipping address,
 *    create order, and attach shipping address snapshot.
 * 4. Attempt shipment creation as customer and seller, both expected to fail with
 *    errors (authorization).
 * 5. As admin, attempt to create shipments with invalid references:
 *
 *    - Non-existent orderCode
 *    - Mismatched order item/SKU references for a real order
 * 6. Finally, as admin, create a valid shipment for the real order using correct
 *    shipping address, method, order item id and SKU id.
 * 7. Assert that the final valid shipment references the correct order and that
 *    its first shipment item matches the order item and SKU, demonstrating that
 *    earlier failures did not leave invalid side effects.
 */
export async function test_api_admin_create_shipment_unauthorized_and_invalid_references(
  connection: api.IConnection,
) {
  // 1. Register actors: customer, seller, admin (each join auto‑logs in and sets Authorization header)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> =
    "Customer1!" as string & tags.Format<"password">;

  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> =
    "Seller1!" as string & tags.Format<"password">;

  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = "Admin1!" as string &
    tags.Format<"password">;

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Switch to admin explicitly before admin-only setup
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);

  // 3. Admin master data: country and region
  const countryCreate = {
    country_code: RandomGenerator.alphaNumeric(2).toUpperCase(),
    name_en: "Test Country",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreate,
    });
  typia.assert(country);

  const regionCreate = {
    code: "TST-REGION",
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
        body: regionCreate,
      },
    );
  typia.assert(region);

  // 4. Admin master data: category
  const categoryCreate = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Test Category",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  // 5. Admin master data: SKU inventory state
  const skuStateCreate = {
    code: "in_stock",
    name: "In Stock",
    description: "SKU is available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuStateCreate },
    );
  typia.assert(skuState);

  // 6. Admin master data: shipping & payment methods
  const shippingMethodCreate = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreate,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreate = {
    code: "card",
    display_name: "Credit Card",
    description: "Card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreate,
    });
  typia.assert(paymentMethod);

  // 7. Switch to seller for product & SKU creation
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/login",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerLogin);

  // Product
  const productCreate = {
    code: RandomGenerator.alphaNumeric(10),
    title: "Test Product",
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: "Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // Switch back to admin to link product to category
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoginAgain);

  const productCategoryCreate = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreate,
      },
    );
  typia.assert(productCategory);

  // Switch to seller to create SKU
  const sellerLoginAgain = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerLoginAgain);

  const skuCreate = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    low_stock_threshold: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreate,
    });
  typia.assert(sku);

  // 8. Switch to customer and create cart, cart item, address, order, shipping address snapshot
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/login",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginAgain = await api.functional.auth.customer.login(
    connection,
    {
      body: customerLoginBody,
    },
  );
  typia.assert(customerLoginAgain);

  const cartCreate = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert(cart);

  const cartItemCreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreate,
    });
  typia.assert(cartItem);

  const customerId = customerAuth.id;

  const customerAddressCreate = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: null,
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: customerAddressCreate,
      },
    );
  typia.assert(customerAddress);

  const orderCreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 satisfies number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  const orderCode = order.order_code;

  const shippingAddressCreate = {
    recipient_name: customerAddress.recipient_name,
    line1: customerAddress.line1,
    line2: customerAddress.line2 ?? null,
    city: customerAddress.city,
    postal_code: customerAddress.postal_code,
    country_code: country.country_code satisfies string &
      tags.MinLength<2> &
      tags.MaxLength<2>,
    region: null,
    phone_number: customerAddress.phone_number ?? null,
  } satisfies IShoppingMallOrderShippingAddress.ICreate;

  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode,
        body: shippingAddressCreate,
      },
    );
  typia.assert(orderShippingAddress);

  const firstOrderItem: IShoppingMallOrderItem | undefined = order.items[0];
  if (!firstOrderItem) throw new Error("Order contains no items");

  // 9. Unauthorized shipment attempts as customer and seller
  const shipmentBodyValid = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "pending",
    carrierName: null,
    trackingNumber: null,
    expectedShipDate: null,
    shipmentItems: [
      {
        shopping_mall_order_item_id: firstOrderItem.id,
        shopping_mall_sku_id: firstOrderItem.sku.id,
        quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
  } satisfies IShoppingMallShipment.ICreate;

  await TestValidator.error(
    "customer cannot create admin shipment",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.create(
        connection,
        {
          orderCode,
          body: shipmentBodyValid,
        },
      );
    },
  );

  // Switch to seller and retry unauthorized attempt
  const sellerLoginThird = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerLoginThird);

  await TestValidator.error("seller cannot create admin shipment", async () => {
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: shipmentBodyValid,
      },
    );
  });

  // 10. Invalid reference scenarios as admin
  const adminLoginThird = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoginThird);

  // Non-existent orderCode
  const nonExistentOrderCode = `${orderCode}-NONEXIST`;

  const shipmentBodyForNonExistingOrder = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "pending",
    carrierName: null,
    trackingNumber: null,
    expectedShipDate: null,
    shipmentItems: [
      {
        shopping_mall_order_item_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
  } satisfies IShoppingMallShipment.ICreate;

  await TestValidator.error(
    "admin cannot create shipment for non-existent orderCode",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.create(
        connection,
        {
          orderCode: nonExistentOrderCode,
          body: shipmentBodyForNonExistingOrder,
        },
      );
    },
  );

  // Mismatched order item and SKU refs for real order
  const invalidRefsBody = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "pending",
    carrierName: null,
    trackingNumber: null,
    expectedShipDate: null,
    shipmentItems: [
      {
        shopping_mall_order_item_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
  } satisfies IShoppingMallShipment.ICreate;

  await TestValidator.error(
    "admin cannot create shipment with mismatched order item and sku refs",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.create(
        connection,
        {
          orderCode,
          body: invalidRefsBody,
        },
      );
    },
  );

  // 11. Valid shipment creation as admin after failures
  const validShipmentBody = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "shipped",
    carrierName: "Test Carrier",
    trackingNumber: RandomGenerator.alphaNumeric(12),
    expectedShipDate: null,
    shipmentItems: [
      {
        shopping_mall_order_item_id: firstOrderItem.id,
        shopping_mall_sku_id: firstOrderItem.sku.id,
        quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: validShipmentBody,
      },
    );
  typia.assert(shipment);

  TestValidator.predicate(
    "shipment should reference the correct order code",
    shipment.order !== undefined &&
      shipment.order !== null &&
      shipment.order.order_code === orderCode,
  );

  TestValidator.predicate(
    "shipment should contain at least one item",
    Array.isArray(shipment.items) && shipment.items.length >= 1,
  );

  const createdShipmentItem: IShoppingMallShipmentItem | undefined =
    shipment.items && shipment.items[0];
  if (!createdShipmentItem) throw new Error("Shipment has no items");

  TestValidator.equals(
    "shipment item order item id should match",
    createdShipmentItem.shopping_mall_order_item_id,
    firstOrderItem.id,
  );

  TestValidator.equals(
    "shipment item sku id should match",
    createdShipmentItem.shopping_mall_sku_id,
    firstOrderItem.sku.id,
  );
}
