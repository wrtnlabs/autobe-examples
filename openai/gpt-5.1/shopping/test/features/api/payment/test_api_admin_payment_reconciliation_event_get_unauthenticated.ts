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
import type { IShoppingMallPaymentReconciliationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationEvent";
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
 * Ensure that reconciliation events are only retrievable by authenticated admin
 * actors.
 *
 * This E2E test walks a full happy-path business flow to obtain a real
 * IShoppingMallPaymentReconciliationEvent instance, then verifies that:
 *
 * 1. An unauthenticated connection (no Authorization header) cannot retrieve the
 *    event using the admin GET endpoint; the SDK must throw.
 * 2. A properly authenticated admin connection can successfully retrieve the same
 *    event and the returned payload matches the created entity.
 *
 * High level steps:
 *
 * - Admin join/login, create country/region/shipping/payment methods, category.
 * - Seller join/login, create product and SKU inventory state/SKU, link to
 *   category.
 * - Customer join/login, create cart, customer address, order, and logical
 *   payment.
 * - Admin creates a reconciliation event for that payment.
 * - Use a cloned unauthenticated connection to call the admin GET endpoint and
 *   assert that it fails.
 * - Log back in as admin and confirm the same GET call succeeds and returns the
 *   correct reconciliation event.
 */
export async function test_api_admin_payment_reconciliation_event_get_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins (auto-authenticated by SDK on success)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail: string = sellerAuthorized.email;
  const sellerPassword: string = sellerJoinBody.password;

  // 3. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.shoppingmall.test/join",
    referrer: "https://customer.shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId: string = customerAuthorized.id;
  const customerEmail: string = customerAuthorized.email;
  const customerPassword: string = customerJoinBody.password;

  // 4. Admin: create country
  // Ensure admin is authenticated (join already set token, but be explicit via login)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAfterLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

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

  // 5. Admin: create region under country
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

  // 6. Admin: create shipping method
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

  // 7. Admin: create payment method
  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card payment",
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

  // 8. Admin: create category
  const categoryBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 9. Seller: login and create product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterLogin);

  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Product",
    summary: "Test product summary",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/product.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 10. Admin: create SKU inventory state (requires admin auth)
  const skuInventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Standard in-stock state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  // Switch back to admin via login to ensure admin token
  const adminAfterSecondLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterSecondLogin);

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 11. Admin: link product to category
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

  // 12. Seller: login again and create SKU for product
  const sellerAfterSecondLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterSecondLogin);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 1,
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

  // 13. Customer: login and create cart
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.shoppingmall.test/login",
    referrer: "https://customer.shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAfterLogin);

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

  // 14. Customer: create address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Market Street",
    line2: null,
    city: "San Francisco",
    postal_code: "94105",
    phone_number: RandomGenerator.mobile("+1415"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBody,
      },
    );
  typia.assert(customerAddress);

  // 15. Customer: create order using SKU and address
  const orderItemCreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallOrderItem.ICreate;

  const shippingAddressSnapshotBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotBody,
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

  // 16. Customer: create logical payment for order
  const payableAmount: number = order.grand_total_amount;

  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentBody,
      },
    );
  typia.assert(orderPayment);

  // 17. Admin: login again and create reconciliation event
  const adminAfterThirdLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterThirdLogin);

  const reconciliationEventBody = {
    event_type: "amount_mismatch",
    provider_amount: orderPayment.payable_amount,
    internal_amount: orderPayment.payable_amount,
    currency_code: orderPayment.currency_code,
    resolution_status: "open",
    resolution_note: "Initial reconciliation event for test",
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;

  const reconciliationEvent: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        body: reconciliationEventBody,
      },
    );
  typia.assert(reconciliationEvent);

  // 18. Unauthorized access: clone connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated GET reconciliation event should fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
        unauthConn,
        {
          orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
          reconciliationEventId: reconciliationEvent.id as string &
            tags.Format<"uuid">,
        },
      );
    },
  );

  // 19. Authorized access: ensure admin is logged in again on main connection
  const adminAfterFourthLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterFourthLogin);

  const fetchedEvent: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        reconciliationEventId: reconciliationEvent.id as string &
          tags.Format<"uuid">,
      },
    );
  typia.assert(fetchedEvent);

  // 20. Validate identity linkage
  TestValidator.equals(
    "fetched reconciliation event id should match created id",
    fetchedEvent.id,
    reconciliationEvent.id,
  );
  TestValidator.equals(
    "fetched reconciliation event's order payment id should match order payment",
    fetchedEvent.orderPayment.id,
    orderPayment.id,
  );
}
