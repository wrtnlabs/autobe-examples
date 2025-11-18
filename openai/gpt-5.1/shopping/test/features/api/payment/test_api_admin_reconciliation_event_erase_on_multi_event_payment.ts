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

export async function test_api_admin_reconciliation_event_erase_on_multi_event_payment(
  connection: api.IConnection,
) {
  // 1. Helper to build random but valid emails and URLs
  const randomEmail = () =>
    `${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const randomUrl = () =>
    `https://www.${RandomGenerator.alphabets(8)}.com` as string &
      tags.Format<"uri">;

  // 2. Join customer and login
  const customerJoinInput = {
    email: randomEmail(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuth);

  const customerLoginInput = {
    email: customerJoinInput.email,
    password: customerJoinInput.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginInput,
    });
  typia.assert(customerLogin);

  const customerId = customerLogin.id;

  // 3. Join seller and login
  const sellerEmail = randomEmail();
  const sellerJoinInput = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuth);

  const sellerLoginInput = {
    email: sellerEmail,
    password: sellerJoinInput.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLogin);

  // 4. Join admin and login
  const adminEmail = randomEmail();
  const adminJoinInput = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);

  const adminLoginInput = {
    email: adminEmail,
    password: adminJoinInput.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin);

  // At this point, connection is authenticated as admin because the last login
  // call set connection.headers.Authorization automatically.

  // 5. Admin: create country
  const countryCreate = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
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

  // 6. Admin: create region under that country
  const regionCreate = {
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
        body: regionCreate,
      },
    );
  typia.assert(region);

  // 7. Admin: create category
  const categoryCreate = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category",
    description_en: null,
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  // 8. Admin: create SKU inventory state
  const skuInventoryStateCreate = {
    code: `state-${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "Purchasable inventory state for test",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreate,
      },
    );
  typia.assert(skuInventoryState);

  // 9. Admin: create shipping method
  const shippingMethodCreate = {
    method_code: `ship-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Shipping",
    service_level_description: "Standard test shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreate,
    });
  typia.assert(shippingMethod);

  // 10. Admin: create payment method
  const paymentMethodCreate = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Payment Method",
    description: null,
    provider_type: "test_provider",
    allowed_currencies: "USD",
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

  // 11. Switch to seller: login again to ensure seller token is active
  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLogin2);

  // 12. Seller: create product
  const productCreate = {
    code: `prod-${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Product",
    summary: "Test product summary",
    description: "Test product description",
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: randomUrl(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 13. Switch back to admin to link product to category
  const adminLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin2);

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

  // 14. Switch to seller again to create SKU
  const sellerLogin3: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLogin3);

  const skuCreate = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreate,
    });
  typia.assert(sku);

  // 15. Switch to customer for cart/order/payment
  const customerLogin2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginInput,
    });
  typia.assert(customerLogin2);

  // 16. Create cart
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

  // 17. Add SKU to cart
  const cartItemCreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreate,
    });
  typia.assert(cartItem);

  // 18. Create customer address
  const customerAddressCreate = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test St",
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
        customerId: customerId,
        body: customerAddressCreate,
      },
    );
  typia.assert(customerAddress);

  // 19. Create first order from cart
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };
  const orderCreate: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 20. Create logical payment for first order
  const paymentCreate: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  };
  const orderPayment1: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreate,
      },
    );
  typia.assert(orderPayment1);

  // 21. Switch back to admin for reconciliation events
  const adminLogin3: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin3);

  // 22. Create two reconciliation events for orderPayment1
  const reconCreateA = {
    event_type: "amount_mismatch",
    provider_amount: orderPayment1.payable_amount + 10,
    internal_amount: orderPayment1.payable_amount,
    currency_code: orderPayment1.currency_code,
    resolution_status: "open",
    resolution_note: "Initial discrepancy detected",
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;
  const reconA: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: orderPayment1.id,
        body: reconCreateA,
      },
    );
  typia.assert(reconA);

  const reconCreateB = {
    event_type: "late_capture",
    provider_amount: orderPayment1.payable_amount,
    internal_amount: orderPayment1.payable_amount,
    currency_code: orderPayment1.currency_code,
    resolution_status: "in_progress",
    resolution_note: "Waiting for provider confirmation",
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;
  const reconB: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: orderPayment1.id,
        body: reconCreateB,
      },
    );
  typia.assert(reconB);

  // 23. Verify we can retrieve both reconciliation events individually
  const reloadedA: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPayment1.id,
        reconciliationEventId: reconA.id,
      },
    );
  typia.assert(reloadedA);

  const reloadedB: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPayment1.id,
        reconciliationEventId: reconB.id,
      },
    );
  typia.assert(reloadedB);

  // Capture original B details for later comparison
  const originalB = {
    event_type: reloadedB.event_type,
    provider_amount: reloadedB.provider_amount,
    internal_amount: reloadedB.internal_amount,
    currency_code: reloadedB.currency_code,
    resolution_status: reloadedB.resolution_status,
    resolution_note: reloadedB.resolution_note,
  };

  // 24. Delete reconciliation event A
  await api.functional.shoppingMall.admin.payments.reconciliationEvents.erase(
    connection,
    {
      orderPaymentId: orderPayment1.id,
      reconciliationEventId: reconA.id,
    },
  );

  // 25. Ensure reconciliation event B still exists and is unchanged
  const afterDeleteB: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
      connection,
      {
        orderPaymentId: orderPayment1.id,
        reconciliationEventId: reconB.id,
      },
    );
  typia.assert(afterDeleteB);

  TestValidator.equals(
    "reconciliation event B event_type remains unchanged after deleting A",
    afterDeleteB.event_type,
    originalB.event_type,
  );
  TestValidator.equals(
    "reconciliation event B provider_amount remains unchanged after deleting A",
    afterDeleteB.provider_amount,
    originalB.provider_amount,
  );
  TestValidator.equals(
    "reconciliation event B internal_amount remains unchanged after deleting A",
    afterDeleteB.internal_amount,
    originalB.internal_amount,
  );
  TestValidator.equals(
    "reconciliation event B currency_code remains unchanged after deleting A",
    afterDeleteB.currency_code,
    originalB.currency_code,
  );
  TestValidator.equals(
    "reconciliation event B resolution_status remains unchanged after deleting A",
    afterDeleteB.resolution_status,
    originalB.resolution_status,
  );
  TestValidator.equals(
    "reconciliation event B resolution_note remains unchanged after deleting A",
    afterDeleteB.resolution_note,
    originalB.resolution_note,
  );

  // 26. Verify reconciliation event A no longer exists for this payment
  await TestValidator.error(
    "deleted reconciliation event A should not be retrievable",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
        connection,
        {
          orderPaymentId: orderPayment1.id,
          reconciliationEventId: reconA.id,
        },
      );
    },
  );

  // 27. Create a second order/payment to test cross-payment deletion safety
  const cartCreate2 = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart2: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreate2,
    });
  typia.assert(cart2);

  const cartItemCreate2 = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart2.id,
      body: cartItemCreate2,
    });
  typia.assert(cartItem2);

  const orderItemCreate2: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };
  const orderCreate2: IShoppingMallOrder.ICreate = {
    cart_id: cart2.id,
    currency_code: "USD",
    items: [orderItemCreate2],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };
  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate2,
    });
  typia.assert(order2);

  const paymentCreate2: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order2.currency_code,
    payable_amount: order2.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  };
  const orderPayment2: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order2.id,
        body: paymentCreate2,
      },
    );
  typia.assert(orderPayment2);

  // Switch back to admin to create event for second payment
  const adminLogin4: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin4);

  const reconCreateC = {
    event_type: "provider_report_only",
    provider_amount: orderPayment2.payable_amount,
    internal_amount: orderPayment2.payable_amount,
    currency_code: orderPayment2.currency_code,
    resolution_status: "open",
    resolution_note: "Event for second payment",
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;
  const reconC: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: orderPayment2.id,
        body: reconCreateC,
      },
    );
  typia.assert(reconC);

  // 28. Attempt to erase reconC using the WRONG payment id (orderPayment1.id)
  await TestValidator.error(
    "erase should fail when reconciliationEventId does not belong to given orderPaymentId",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.erase(
        connection,
        {
          orderPaymentId: orderPayment1.id,
          reconciliationEventId: reconC.id,
        },
      );
    },
  );

  // 29. Erase reconC with the correct payment id should succeed
  await api.functional.shoppingMall.admin.payments.reconciliationEvents.erase(
    connection,
    {
      orderPaymentId: orderPayment2.id,
      reconciliationEventId: reconC.id,
    },
  );

  // Confirm reconC no longer retrievable under its correct payment
  await TestValidator.error(
    "deleted reconciliation event C should not be retrievable on its own payment",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.at(
        connection,
        {
          orderPaymentId: orderPayment2.id,
          reconciliationEventId: reconC.id,
        },
      );
    },
  );
}
