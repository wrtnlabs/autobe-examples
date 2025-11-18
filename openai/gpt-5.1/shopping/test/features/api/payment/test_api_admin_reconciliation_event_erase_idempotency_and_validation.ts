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

export async function test_api_admin_reconciliation_event_erase_idempotency_and_validation(
  connection: api.IConnection,
) {
  // 1. Admin, Customer, and Seller authentication setup
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // Ensure admin actor is active before admin-only operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  // 2. Admin master data: country, region, shipping, payment method, sku inventory state
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
  typia.assert<IShoppingMallCountry>(country);

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
  typia.assert<IShoppingMallRegion>(region);
  TestValidator.equals(
    "region.country.id matches country.id",
    region.country.id,
    country.id,
  );

  const shippingMethodCreateBody = {
    method_code: "standard_ground",
    display_name: "Standard Ground Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard credit card processor",
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
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for immediate purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 3. Category, product, SKU
  const categoryCreateBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphabets(6)}`,
    name_en: "Electronics",
    description_en: "Electronics and gadgets",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // Switch to seller before seller operations
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Phone",
    summary: "A test smartphone product",
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: "TestBrand",
    model_name: "TB-1000",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/test-phone.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Switch back to admin for admin-only product-category link
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

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
  typia.assert<IShoppingMallProductCategory>(productCategory);
  TestValidator.equals(
    "productCategory.shopping_mall_product_id matches product.id",
    productCategory.shopping_mall_product_id,
    product.id,
  );

  // Switch to seller to create SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuCreateBody: IShoppingMallSku.ICreate = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);
  TestValidator.equals(
    "sku.product.id matches product.id",
    sku.product.id,
    product.id,
  );

  // 4. Customer cart, item, address, and order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  const cartItemCreateBody: IShoppingMallCartItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Market Street",
    line2: null,
    city: "San Francisco",
    postal_code: "94103",
    phone_number: RandomGenerator.mobile("+1415"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const shippingSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshotCreate,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);
  TestValidator.equals(
    "order.customer.id matches customer.id",
    order.customer?.id ?? customer.id,
    customer.id,
  );

  // 5. Create first logical payment for the order
  const paymentCreateBody1: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const payment1: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody1,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(payment1);
  TestValidator.equals(
    "payment1.shopping_mall_order_id matches order.id",
    payment1.shopping_mall_order_id,
    order.id,
  );

  const orderPaymentId1: string & tags.Format<"uuid"> = payment1.id as string &
    tags.Format<"uuid">;

  // 6. Admin creates first reconciliation event for payment1
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const recEventCreateBody1: IShoppingMallPaymentReconciliationEvent.ICreate = {
    event_type: "amount_mismatch",
    provider_amount: payment1.payable_amount + 10,
    internal_amount: payment1.payable_amount,
    currency_code: payment1.currency_code,
    resolution_status: "open",
    resolution_note: "Initial discrepancy detected",
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;

  const recEvent1: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: orderPaymentId1,
        body: recEventCreateBody1,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(recEvent1);

  const recEventId1: string & tags.Format<"uuid"> = recEvent1.id as string &
    tags.Format<"uuid">;

  // 7. Validate pre-deletion existence via GET
  const recEventLoaded1: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPaymentId1,
        reconciliationEventId: recEventId1,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(recEventLoaded1);
  TestValidator.equals(
    "loaded reconciliation event id matches created id",
    recEventLoaded1.id,
    recEventId1,
  );
  TestValidator.equals(
    "loaded reconciliation event payment id matches payment1.id",
    recEventLoaded1.orderPayment.id,
    payment1.id,
  );

  // 8. Primary DELETE: erase recEvent1 and verify it cannot be fetched
  await api.functional.shoppingMall.admin.payments.reconciliationEvents.erase(
    connection,
    {
      orderPaymentId: orderPaymentId1,
      reconciliationEventId: recEventId1,
    },
  );

  await TestValidator.error("GET after deletion should fail", async () => {
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPaymentId1,
        reconciliationEventId: recEventId1,
      },
    );
  });

  // 9. Second DELETE with same IDs to test idempotency / already-deleted behavior
  await TestValidator.error(
    "second DELETE on already-deleted reconciliation event should fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.erase(
        connection,
        {
          orderPaymentId: orderPaymentId1,
          reconciliationEventId: recEventId1,
        },
      );
    },
  );

  // 10. Mismatched reconciliationEventId and existing orderPaymentId
  // 10-1. Create a second reconciliation event on payment1
  const recEventCreateBody2: IShoppingMallPaymentReconciliationEvent.ICreate = {
    event_type: "late_capture",
    provider_amount: payment1.payable_amount,
    internal_amount: payment1.payable_amount,
    currency_code: payment1.currency_code,
    resolution_status: "open",
    resolution_note: "Second event for payment1",
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;

  const recEvent2: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: orderPaymentId1,
        body: recEventCreateBody2,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(recEvent2);

  const recEventId2: string & tags.Format<"uuid"> = recEvent2.id as string &
    tags.Format<"uuid">;

  // 10-2. Create a second logical payment for the same order and a reconciliation event on it
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const paymentCreateBody2: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount / 2,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const payment2: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody2,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(payment2);
  TestValidator.equals(
    "payment2.shopping_mall_order_id matches order.id",
    payment2.shopping_mall_order_id,
    order.id,
  );

  const orderPaymentId2: string & tags.Format<"uuid"> = payment2.id as string &
    tags.Format<"uuid">;

  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const recEventCreateBody3: IShoppingMallPaymentReconciliationEvent.ICreate = {
    event_type: "provider_report_only",
    provider_amount: payment2.payable_amount,
    internal_amount: payment2.payable_amount,
    currency_code: payment2.currency_code,
    resolution_status: "open",
    resolution_note: "Event for payment2",
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;

  const recEvent3: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: orderPaymentId2,
        body: recEventCreateBody3,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(recEvent3);

  const recEventId3: string & tags.Format<"uuid"> = recEvent3.id as string &
    tags.Format<"uuid">;

  // 10-3. Attempt to delete recEvent3 using orderPaymentId1 (mismatched payment)
  await TestValidator.error(
    "DELETE with mismatched payment and reconciliationEventId should fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.erase(
        connection,
        {
          orderPaymentId: orderPaymentId1,
          reconciliationEventId: recEventId3,
        },
      );
    },
  );

  // Confirm recEvent2 for payment1 still exists
  const recEvent2Loaded: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPaymentId1,
        reconciliationEventId: recEventId2,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(recEvent2Loaded);
  TestValidator.equals(
    "recEvent2Loaded.id matches recEventId2",
    recEvent2Loaded.id,
    recEventId2,
  );

  // Confirm recEvent3 for payment2 still exists
  const recEvent3Loaded: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPaymentId2,
        reconciliationEventId: recEventId3,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(recEvent3Loaded);
  TestValidator.equals(
    "recEvent3Loaded.id matches recEventId3",
    recEvent3Loaded.id,
    recEventId3,
  );

  // 11. DELETE with non-existent orderPaymentId should fail and not affect existing events
  const nonExistentPaymentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "DELETE with non-existent payment id should fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.erase(
        connection,
        {
          orderPaymentId: nonExistentPaymentId,
          reconciliationEventId: recEventId2,
        },
      );
    },
  );

  const recEvent2AfterFailedDelete: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPaymentId1,
        reconciliationEventId: recEventId2,
      },
    );
  typia.assert<IShoppingMallPaymentReconciliationEvent>(
    recEvent2AfterFailedDelete,
  );
  TestValidator.equals(
    "recEvent2AfterFailedDelete.id matches recEventId2",
    recEvent2AfterFailedDelete.id,
    recEventId2,
  );
}
