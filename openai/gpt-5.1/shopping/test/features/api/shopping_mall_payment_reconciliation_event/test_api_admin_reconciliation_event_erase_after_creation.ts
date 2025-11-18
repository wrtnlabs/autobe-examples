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

export async function test_api_admin_reconciliation_event_erase_after_creation(
  connection: api.IConnection,
) {
  // 1. Customer joins (registration) and becomes authenticated
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Customer creates an empty cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 3. Admin joins (registration) and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Admin creates a country
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
  typia.assert<IShoppingMallCountry>(country);

  // 5. Admin creates a region under the country
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
  typia.assert<IShoppingMallRegion>(region);

  // 6. Admin creates a shipping method
  const shippingMethodBody = {
    method_code: "ground",
    display_name: "Ground Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // 7. Admin creates a payment method
  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard credit card payment",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: 1,
    max_amount: 100000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 8. Seller joins and becomes authenticated
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 9. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Acme",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 10. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Electronics",
    description_en: "Electronic devices and accessories",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 11. Admin links product to category
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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 12. Admin creates SKU inventory state
  const skuInventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Sellable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 13. Seller creates a SKU under the product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 50,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 14. Switch back to customer via login to ensure correct actor context
  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoggedIn);
  TestValidator.equals(
    "customer id is stable after login",
    customerLoggedIn.id,
    customerAuthorized.id,
  );

  // 15. Customer adds SKU to cart
  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // 16. Customer creates a shipping address referencing the country and region
  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Market Street",
    line2: "Suite 100",
    city: "San Francisco",
    postal_code: "94105",
    phone_number: RandomGenerator.mobile("+1415"),
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
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 17. Customer creates an order from the cart
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  };
  const orderBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
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
      body: orderBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  TestValidator.equals(
    "order currency matches cart currency",
    order.currency_code,
    cart.currency_code,
  );

  // 18. Customer creates a logical payment for the order
  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
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
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  TestValidator.equals(
    "payment order id should match order",
    orderPayment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment customer id should match customer",
    orderPayment.shopping_mall_customer_id,
    customerAuthorized.id,
  );

  // 19. Switch back to admin via login to ensure admin context
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);
  TestValidator.equals(
    "admin id is stable after login",
    adminLoggedIn.id,
    adminAuthorized.id,
  );

  // 20. Admin fetches the payment via admin view to take a baseline snapshot
  const paymentBeforeErase: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.admin.payments.at(connection, {
      orderPaymentId: orderPayment.id,
    });
  typia.assert<IShoppingMallOrderPayment>(paymentBeforeErase);

  // 21. Admin creates a reconciliation event for the payment
  const reconciliationEventBody = {
    event_type: "amount_mismatch",
    provider_amount: paymentBeforeErase.payable_amount,
    internal_amount: paymentBeforeErase.payable_amount,
    currency_code: paymentBeforeErase.currency_code,
    resolution_status: "open",
    resolution_note: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;
  const reconciliationEvent: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        body: reconciliationEventBody,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(reconciliationEvent);

  TestValidator.equals(
    "reconciliation event is linked to correct payment",
    reconciliationEvent.orderPayment.id,
    orderPayment.id,
  );

  // 22. Admin can retrieve the reconciliation event individually
  const reconciliationEventReloaded: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        reconciliationEventId: reconciliationEvent.id,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(
    reconciliationEventReloaded,
  );
  TestValidator.equals(
    "reloaded reconciliation event id matches created id",
    reconciliationEventReloaded.id,
    reconciliationEvent.id,
  );

  // 23. Admin can see the reconciliation event in the summary index view
  const reconciliationSummary: IShoppingMallPaymentReconciliationEvent.ISummary =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.index(
      connection,
      {
        orderPaymentId: orderPayment.id,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent.ISummary>(
    reconciliationSummary,
  );
  TestValidator.equals(
    "summary reconciliation event is for the same payment",
    reconciliationSummary.orderPayment.id,
    orderPayment.id,
  );

  // When only one event exists, summary id should match our created event id
  TestValidator.equals(
    "summary reconciliation event id matches created event id",
    reconciliationSummary.id,
    reconciliationEvent.id,
  );

  // 24. Admin erases the reconciliation event under the payment
  const paymentPayableBeforeErase = paymentBeforeErase.payable_amount;
  const paymentCapturedBeforeErase = paymentBeforeErase.captured_amount;
  const paymentRefundedBeforeErase = paymentBeforeErase.refunded_amount;
  const paymentChargebackBeforeErase = paymentBeforeErase.chargeback_amount;
  const paymentCurrencyBeforeErase = paymentBeforeErase.currency_code;

  await api.functional.shoppingMall.admin.payments.reconciliationEvents.erase(
    connection,
    {
      orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
      reconciliationEventId: reconciliationEvent.id,
    },
  );

  // 25. Verify payment core monetary fields are unchanged after erase
  const paymentAfterErase: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.admin.payments.at(connection, {
      orderPaymentId: orderPayment.id,
    });
  typia.assert<IShoppingMallOrderPayment>(paymentAfterErase);

  TestValidator.equals(
    "payable_amount is unchanged after reconciliation erase",
    paymentAfterErase.payable_amount,
    paymentPayableBeforeErase,
  );
  TestValidator.equals(
    "captured_amount is unchanged after reconciliation erase",
    paymentAfterErase.captured_amount,
    paymentCapturedBeforeErase,
  );
  TestValidator.equals(
    "refunded_amount is unchanged after reconciliation erase",
    paymentAfterErase.refunded_amount,
    paymentRefundedBeforeErase,
  );
  TestValidator.equals(
    "chargeback_amount is unchanged after reconciliation erase",
    paymentAfterErase.chargeback_amount,
    paymentChargebackBeforeErase,
  );
  TestValidator.equals(
    "currency_code is unchanged after reconciliation erase",
    paymentAfterErase.currency_code,
    paymentCurrencyBeforeErase,
  );

  // 26. After deletion, fetching the same reconciliation event should fail
  await TestValidator.error(
    "fetching erased reconciliation event should fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
        connection,
        {
          orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
          reconciliationEventId: reconciliationEvent.id,
        },
      );
    },
  );
}
