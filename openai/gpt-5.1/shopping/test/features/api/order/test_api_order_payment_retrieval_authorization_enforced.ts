import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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
 * Verify that order payment retrieval is authorized only for the owning
 * customer.
 *
 * Business goal:
 *
 * - Ensure that GET
 *   /shoppingMall/customer/orders/{orderId}/payments/{paymentSequence} returns
 *   payment details for the rightful customer (owner of the order), and that
 *   another customer cannot use the same path parameters to read someone else’s
 *   payment.
 *
 * High level steps implemented:
 *
 * 1. Bootstrap admin, seller, and catalog primitives (country, region, category,
 *    SKU inventory state, shipping method, payment method, product, SKU).
 * 2. Create Customer A, a cart, and a shipping address.
 * 3. Create an order and a logical payment for Customer A.
 * 4. Create Customer B (a different authenticated customer).
 * 5. As Customer A, successfully retrieve the payment via the GET endpoint and
 *    assert business field consistency.
 * 6. As Customer B, attempt to retrieve Customer A’s payment and assert that the
 *    call fails via TestValidator.error.
 * 7. Optionally, create a separate order and payment for Customer B and verify
 *    that B can retrieve their own payment successfully.
 */
export async function test_api_order_payment_retrieval_authorization_enforced(
  connection: api.IConnection,
) {
  // Helper to clone connection with empty headers, used when switching
  // between actors in tests without manually mutating headers.
  const freshConnection = (): api.IConnection => ({
    ...connection,
    headers: {},
  });

  // -----------------------------
  // 1. Admin bootstrap
  // -----------------------------
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminHref = "https://admin.example.com/join";
  const adminReferrer = "https://admin.example.com/";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: adminHref as string & tags.Format<"uri">,
    referrer: adminReferrer as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(freshConnection(), {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: adminReferrer as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminConn: api.IConnection = freshConnection();
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(adminConn, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Admin: create country
  const countryCreate = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(adminConn, {
      body: countryCreate,
    });
  typia.assert(country);

  // Admin: create region under that country
  const regionCreate = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      adminConn,
      {
        countryCode: country.country_code,
        body: regionCreate,
      },
    );
  typia.assert(region);

  // Admin: create category
  const categoryCreate = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConn, {
      body: categoryCreate,
    });
  typia.assert(category);

  // Admin: create SKU inventory state (purchasable)
  const skuStateCreate = {
    code: "in_stock",
    name: "In Stock",
    description: "Regular in-stock inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      adminConn,
      {
        body: skuStateCreate,
      },
    );
  typia.assert(skuState);

  // Admin: create shipping method
  const shippingMethodCreate = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(adminConn, {
      body: shippingMethodCreate,
    });
  typia.assert(shippingMethod);

  // Admin: create payment method
  const paymentMethodCreate = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card payment",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(adminConn, {
      body: paymentMethodCreate,
    });
  typia.assert(paymentMethod);

  // -----------------------------
  // 2. Seller and catalog setup
  // -----------------------------
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const sellerConn: api.IConnection = freshConnection();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(sellerConn, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  // Seller: create product
  const productCreate = {
    code: RandomGenerator.alphaNumeric(10),
    title: "Test Product",
    summary: "Short summary",
    description: RandomGenerator.paragraph({ sentences: 10 }),
    brand: "TestBrand",
    model_name: "TB-100",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConn, {
      body: productCreate,
    });
  typia.assert(product);

  // Admin: link product to category
  const productCategoryCreate = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      adminConn,
      {
        productId: product.id,
        body: productCategoryCreate,
      },
    );
  typia.assert(productCategory);

  // Seller: create SKU under product
  const skuCreate = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [] satisfies IShoppingMallSkuExternalId.ICreate[] | undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(sellerConn, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreate,
    });
  typia.assert(sku);

  // -----------------------------
  // 3. Customer A: join, cart, address
  // -----------------------------
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const customerAConn: api.IConnection = freshConnection();

  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerAConn, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  // Customer A: create cart
  const cartCreateA = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cartA: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(customerAConn, {
      body: cartCreateA,
    });
  typia.assert(cartA);

  // Customer A: create customer address
  const addressCreateA = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Main St",
    line2: "Apt 1",
    city: "Los Angeles",
    postal_code: "90001",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressA: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      customerAConn,
      {
        customerId: customerAAuth.id,
        body: addressCreateA,
      },
    );
  typia.assert(addressA);

  // -----------------------------
  // 4. Order and payment for Customer A
  // -----------------------------
  const orderCreateA = {
    cart_id: cartA.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: addressA.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(customerAConn, {
      body: orderCreateA,
    });
  typia.assert(orderA);

  // Customer A: create logical payment for the order
  const paymentCreateA = {
    payment_method_id: paymentMethod.id,
    currency_code: orderA.currency_code,
    payable_amount: orderA.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const paymentA: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      customerAConn,
      {
        orderId: orderA.id,
        body: paymentCreateA,
      },
    );
  typia.assert(paymentA);

  // -----------------------------
  // 5. Customer B: join
  // -----------------------------
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const customerBConn: api.IConnection = freshConnection();

  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerBConn, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  // -----------------------------
  // 6. Main authorization checks
  // -----------------------------
  // 6-1. Customer A can retrieve its own payment
  const paymentARead: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.at(
      customerAConn,
      {
        orderId: orderA.id,
        paymentSequence: String(paymentA.payment_sequence),
      },
    );
  typia.assert(paymentARead);

  TestValidator.equals(
    "paymentARead belongs to correct order",
    paymentARead.shopping_mall_order_id,
    orderA.id,
  );
  TestValidator.equals(
    "paymentARead sequence matches",
    paymentARead.payment_sequence,
    paymentA.payment_sequence,
  );
  TestValidator.equals(
    "paymentARead currency matches",
    paymentARead.currency_code,
    paymentA.currency_code,
  );
  TestValidator.equals(
    "paymentARead payable amount matches",
    paymentARead.payable_amount,
    paymentA.payable_amount,
  );

  // 6-2. Customer B must not be able to read Customer A's payment
  await TestValidator.error("customer B cannot read A payment", async () => {
    await api.functional.shoppingMall.customer.orders.payments.at(
      customerBConn,
      {
        orderId: orderA.id,
        paymentSequence: String(paymentA.payment_sequence),
      },
    );
  });

  // -----------------------------
  // 7. Optional: Customer B creates own order/payment and can read it
  // -----------------------------
  const cartCreateB = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cartB: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(customerBConn, {
      body: cartCreateB,
    });
  typia.assert(cartB);

  const addressCreateB = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "456 Market St",
    line2: "Suite 200",
    city: "San Francisco",
    postal_code: "94105",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressB: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      customerBConn,
      {
        customerId: customerBAuth.id,
        body: addressCreateB,
      },
    );
  typia.assert(addressB);

  const orderCreateB = {
    cart_id: cartB.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 2 as number & tags.Type<"int32">,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: addressB.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(customerBConn, {
      body: orderCreateB,
    });
  typia.assert(orderB);

  const paymentCreateB = {
    payment_method_id: paymentMethod.id,
    currency_code: orderB.currency_code,
    payable_amount: orderB.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const paymentB: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      customerBConn,
      {
        orderId: orderB.id,
        body: paymentCreateB,
      },
    );
  typia.assert(paymentB);

  const paymentBRead: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.at(
      customerBConn,
      {
        orderId: orderB.id,
        paymentSequence: String(paymentB.payment_sequence),
      },
    );
  typia.assert(paymentBRead);

  TestValidator.equals(
    "paymentBRead belongs to B's order",
    paymentBRead.shopping_mall_order_id,
    orderB.id,
  );
  TestValidator.equals(
    "paymentBRead sequence matches",
    paymentBRead.payment_sequence,
    paymentB.payment_sequence,
  );
  TestValidator.equals(
    "paymentBRead currency matches",
    paymentBRead.currency_code,
    paymentB.currency_code,
  );
  TestValidator.equals(
    "paymentBRead payable amount matches",
    paymentBRead.payable_amount,
    paymentB.payable_amount,
  );
}
