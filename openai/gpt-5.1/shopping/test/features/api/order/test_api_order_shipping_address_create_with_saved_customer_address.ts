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
 * End-to-end test for creating an order shipping address snapshot from a saved
 * customer address.
 *
 * Business workflow validated by this test:
 *
 * 1. Customer self-registers and becomes the authenticated actor for
 *    customer-scoped APIs.
 * 2. Admin registers core geography and checkout configuration:
 *
 *    - Country master
 *    - Region under the country
 *    - SKU inventory state (purchasable)
 *    - Shipping method configuration
 *    - Payment method configuration
 * 3. Seller registers catalog entities:
 *
 *    - Product owned by the seller
 *    - Category and product-category link
 *    - SKU under the product that uses the inventory state and has reasonable price
 *         and inventory.
 * 4. Customer creates a saved address that references the country and region, and
 *    this address will be used in checkout.
 * 5. Customer creates a cart and adds a cart item pointing to the SKU.
 * 6. Customer creates an order that:
 *
 *    - References the cart by ID
 *    - Selects the shipping method and payment method
 *    - Uses shipping_address_id pointing to the saved customer address and does not
 *         send an inline shipping snapshot (shipping_address_snapshot is null)
 * 7. Customer calls POST /shoppingMall/customer/orders/{orderCode}/shippingAddress
 *    with a minimal body derived from the saved address (no extra snapshot
 *    overrides) so that the backend creates a IShoppingMallOrderShippingAddress
 *    snapshot from order context.
 * 8. The test validates that:
 *
 *    - The response is a valid IShoppingMallOrderShippingAddress object (using
 *         typia.assert).
 *    - The snapshot.order.order_code equals the created order's order_code.
 *    - Core address fields (recipient_name, line1, line2, city, postal_code,
 *         country_code, phone_number) in the snapshot equal the values on the
 *         saved customer address.
 *    - A customerAddressSnapshot reference is present and reflects the same address
 *         values.
 *
 * Note: The scenario description in the input mentions using only a
 * shipping_address_id and letting the system derive the snapshot. However, the
 * available API for creating the order shipping address requires a full
 * IShoppingMallOrderShippingAddress.ICreate body and there is no API to pass
 * only an address ID. Therefore, this test follows the implementable design: it
 * reads the saved customer address and sends its values as the body for the
 * snapshot creation API.
 */
export async function test_api_order_shipping_address_create_with_saved_customer_address(
  connection: api.IConnection,
) {
  // Helper to build a basic URL for href/referrer fields
  const baseHref = "https://shopping.example.com";

  // -----------------------------
  // 1. Customer registration (join)
  // -----------------------------
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: `${baseHref}/signup`,
    referrer: `${baseHref}/landing`,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // Ensure that further customer-scoped calls run as this customer.
  // The SDK has already stored Authorization header on the connection
  // during join(), so we just keep using the same connection.

  // -----------------------------
  // 2. Admin authentication and master data setup
  // -----------------------------
  // Create an admin account (join) and log in as admin for admin APIs.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: `${baseHref}/admin/signup`,
    referrer: `${baseHref}/admin/landing`,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // At this point the connection Authorization header is for admin.

  // 2-1. Create a country
  const countryCreateBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 2-2. Create a region under that country
  const regionCreateBody = {
    code: "CA",
    name_en: "California",
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

  // 2-3. Create a purchasable SKU inventory state
  const inventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Standard purchasable inventory state for SKUs",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // 2-4. Create a shipping method configuration
  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 2-5. Create a payment method configuration
  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard credit card payment",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 2-6. Create a category for the product catalog
  const categoryCreateBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Electronics",
    description_en: "Electronic devices and gadgets",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // -----------------------------
  // 3. Seller authentication and catalog setup
  // -----------------------------
  // Switch to seller by joining as seller (this updates connection headers).
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: `${baseHref}/seller/signup`,
    referrer: `${baseHref}/seller/landing`,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 3-1. Create a product owned by the seller
  const productCreateBody = {
    code: `SKU-PROD-${RandomGenerator.alphaNumeric(6)}`,
    title: "Demo Phone",
    summary: "Demo smartphone for E2E tests",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "AutoBETech",
    model_name: "Model X",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/demo-phone.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3-2. Link the product to the category (admin-only operation)
  // Switch back to admin using admin login to ensure we have admin token again.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: `${baseHref}/admin/login`,
    referrer: `${baseHref}/admin/login-ref`,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 3-3. Switch again to seller for SKU creation
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: `${baseHref}/seller/login`,
    referrer: `${baseHref}/seller/login-ref`,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // -----------------------------
  // 4. Customer address setup
  // -----------------------------
  // Switch back to customer for customer-scoped operations.
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: `${baseHref}/login`,
    referrer: `${baseHref}/login-ref`,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: `${RandomGenerator.alphabets(5)} Street 123`,
    line2: "Unit 45B",
    city: "San Francisco",
    postal_code: "94105",
    phone_number: RandomGenerator.mobile("+1415"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLogin.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // -----------------------------
  // 5. Cart and cart item
  // -----------------------------
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  // -----------------------------
  // 6. Create order from cart using saved address id
  // -----------------------------
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
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

  // -----------------------------
  // 7. Create order shipping address snapshot for the order
  // -----------------------------
  const shippingAddressCreateBody = {
    recipient_name: customerAddress.recipient_name,
    line1: customerAddress.line1,
    line2: customerAddress.line2 ?? null,
    city: customerAddress.city,
    postal_code: customerAddress.postal_code,
    country_code: country.country_code as string &
      tags.MinLength<2> &
      tags.MaxLength<2>,
    region: null,
    phone_number: customerAddress.phone_number ?? null,
  } satisfies IShoppingMallOrderShippingAddress.ICreate;

  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: shippingAddressCreateBody,
      },
    );
  typia.assert(orderShippingAddress);

  // -----------------------------
  // 8. Assertions: linkage and value matching
  // -----------------------------
  // Verify linkage to the correct order.
  TestValidator.equals(
    "shipping address snapshot is linked to the correct order",
    orderShippingAddress.order.order_code,
    order.order_code,
  );

  // Verify that address snapshot values reflect saved address values.
  TestValidator.equals(
    "recipient_name should match saved customer address",
    orderShippingAddress.recipient_name,
    customerAddress.recipient_name,
  );

  TestValidator.equals(
    "line1 should match saved customer address",
    orderShippingAddress.line1,
    customerAddress.line1,
  );

  const expectedLine2: string | null =
    customerAddress.line2 === undefined ? null : customerAddress.line2;
  const actualLine2: string | null =
    orderShippingAddress.line2 === undefined
      ? null
      : orderShippingAddress.line2;
  TestValidator.equals(
    "line2 should match saved customer address (null-safe)",
    actualLine2,
    expectedLine2,
  );

  TestValidator.equals(
    "city should match saved customer address",
    orderShippingAddress.city,
    customerAddress.city,
  );

  TestValidator.equals(
    "postal_code should match saved customer address",
    orderShippingAddress.postal_code,
    customerAddress.postal_code,
  );

  TestValidator.equals(
    "country_code should match country master",
    orderShippingAddress.country_code,
    country.country_code,
  );

  const expectedPhone: string | null =
    customerAddress.phone_number === undefined
      ? null
      : customerAddress.phone_number;
  const actualPhone: string | null =
    orderShippingAddress.phone_number === undefined
      ? null
      : orderShippingAddress.phone_number;
  TestValidator.equals(
    "phone_number should match saved customer address (null-safe)",
    actualPhone,
    expectedPhone,
  );

  // Optionally, if the backend links to a customerAddressSnapshot, verify that
  // basic fields also align with current snapshot. This association can be
  // null depending on implementation, so guard for presence first.
  if (
    orderShippingAddress.customerAddressSnapshot !== undefined &&
    orderShippingAddress.customerAddressSnapshot !== null
  ) {
    const snapshot = orderShippingAddress.customerAddressSnapshot;
    TestValidator.equals(
      "customerAddressSnapshot.recipient_name should match",
      snapshot.recipient_name,
      customerAddress.recipient_name,
    );
    TestValidator.equals(
      "customerAddressSnapshot.line1 should match",
      snapshot.line1,
      customerAddress.line1,
    );
    const snapshotLine2: string | null =
      snapshot.line2 === undefined ? null : snapshot.line2;
    TestValidator.equals(
      "customerAddressSnapshot.line2 should match (null-safe)",
      snapshotLine2,
      expectedLine2,
    );
    TestValidator.equals(
      "customerAddressSnapshot.city should match",
      snapshot.city,
      customerAddress.city,
    );
    TestValidator.equals(
      "customerAddressSnapshot.postal_code should match",
      snapshot.postal_code,
      customerAddress.postal_code,
    );
    const snapshotPhone: string | null =
      snapshot.phone_number === undefined ? null : snapshot.phone_number;
    TestValidator.equals(
      "customerAddressSnapshot.phone_number should match (null-safe)",
      snapshotPhone,
      expectedPhone,
    );
  }
}
