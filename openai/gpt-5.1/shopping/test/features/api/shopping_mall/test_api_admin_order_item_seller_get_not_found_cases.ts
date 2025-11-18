import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
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
import type { IShoppingMallOrderItemSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSeller";
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

export async function test_api_admin_order_item_seller_get_not_found_cases(
  connection: api.IConnection,
) {
  // 1. Create core actors: customer, seller, admin
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test`,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.test/join" as string & tags.Format<"uri">,
    referrer: "https://customer.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test`,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.test/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Ensure admin login context for admin-only APIs
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test/login-ref" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Admin creates country and region
  const countryCreateBody = {
    country_code: `CT-${RandomGenerator.alphabets(3).toUpperCase()}`,
    name_en: "Testland",
    phone_code: "+999",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: `RG-${RandomGenerator.alphabets(3).toUpperCase()}`,
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
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 3. Customer login and create shipping address
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.test/login" as string & tags.Format<"uri">,
    referrer: "https://customer.test/login-ref" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 456",
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLogin.id,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 4. Admin creates shipping and payment methods
  const shippingMethodCreateBody = {
    method_code: `SHIP-${RandomGenerator.alphabets(4)}`,
    display_name: "Test Shipping",
    service_level_description: "Test shipping method",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: `PM-${RandomGenerator.alphabets(4)}`,
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
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 5. Seller creates product, category, SKU inventory state, and SKU
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test/login-ref" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphabets(6).toUpperCase()}`,
    title: "Test Product",
    summary: "Test product summary",
    description: "Test product description",
    brand: "TestBrand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: "https://images.test/product.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Switch back to admin to create category and inventory state
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(5).toLowerCase()}`,
    name_en: "Test Category",
    description_en: "Category for testing",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

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

  const skuInventoryStateCreateBody = {
    code: `INV-${RandomGenerator.alphabets(4)}`,
    name: "In Stock",
    description: "Purchasable inventory state for tests",
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

  // Switch back to seller to create SKU
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphabets(6).toUpperCase()}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer creates cart and adds item
  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAgain);

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
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  // 7. Customer creates first order
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: cartItem.quantity,
  };

  const orderShippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  };

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: orderShippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver quickly",
    platform_note: "Test order",
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order should have at least one item",
    order.items.length > 0,
  );

  const firstOrderItem: IShoppingMallOrderItem = order.items[0];

  // 8. Customer creates payment for the order
  const paymentCreateBody: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  };

  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 9. Admin searches orders to confirm orderCode from admin view
  const adminLoginForOrders: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForOrders);

  const orderSearchBody: IShoppingMallOrder.IRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderCode: order.order_code,
    customerKeyword: undefined,
    sellerId: undefined,
    statusIn: undefined,
    minGrandTotalAmount: undefined,
    maxGrandTotalAmount: undefined,
    placedAtFrom: undefined,
    placedAtTo: undefined,
    includeCancelled: undefined,
    includeFullyRefunded: undefined,
    sortField: undefined,
    sortDirection: undefined,
  };

  const searchResult: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: orderSearchBody,
    });
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result should contain at least one order",
    searchResult.data.length > 0,
  );

  const adminOrderSummary: IShoppingMallOrder.ISummary = searchResult.data[0];
  TestValidator.equals(
    "admin order summary id should match customer order id",
    adminOrderSummary.id,
    order.id,
  );
  TestValidator.equals(
    "admin order summary code should match customer order code",
    adminOrderSummary.order_code,
    order.order_code,
  );

  // 10. Positive control: admin fetches seller mapping for valid pair
  const mapping: IShoppingMallOrderItemSeller =
    await api.functional.shoppingMall.admin.orders.items.seller.at(connection, {
      orderCode: order.order_code,
      orderItemId: firstOrderItem.id,
    });
  typia.assert(mapping);

  TestValidator.equals(
    "mapping order_item id matches firstOrderItem id",
    mapping.order_item.id,
    firstOrderItem.id,
  );

  // 11. Negative scenario A: non-existing orderItemId for valid orderCode
  let nonExistingOrderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  if (nonExistingOrderItemId === firstOrderItem.id) {
    const regenerated: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();
    TestValidator.notEquals(
      "regenerated UUID should differ from firstOrderItem.id",
      regenerated,
      firstOrderItem.id,
    );
    nonExistingOrderItemId = regenerated;
  }

  await TestValidator.error(
    "non-existing orderItemId for existing orderCode should cause error",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.seller.at(
        connection,
        {
          orderCode: order.order_code,
          orderItemId: nonExistingOrderItemId,
        },
      );
    },
  );

  // 12. Negative scenario B: non-existing orderCode with valid orderItemId
  const nonExistingOrderCode = `NON_EXISTING_${RandomGenerator.alphaNumeric(16)}`;

  await TestValidator.error(
    "non-existing orderCode with valid orderItemId should cause error",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.seller.at(
        connection,
        {
          orderCode: nonExistingOrderCode,
          orderItemId: firstOrderItem.id,
        },
      );
    },
  );

  // 13. Negative scenario C: cross-order leakage using second order
  // Reuse existing SKU, address, methods to create a second order
  const cart2: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart2);

  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart2.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem2);

  const orderItemCreate2: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: cartItem2.quantity,
  };

  const orderCreateBody2: IShoppingMallOrder.ICreate = {
    cart_id: cart2.id,
    currency_code: cart2.currency_code,
    items: [orderItemCreate2],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: orderShippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Second order",
    platform_note: "Test order 2",
  };

  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody2,
    });
  typia.assert(order2);

  TestValidator.predicate(
    "second order should have at least one item",
    order2.items.length > 0,
  );

  const secondOrderItem: IShoppingMallOrderItem = order2.items[0];

  await TestValidator.error(
    "cross-order pair (orderCode1, orderItemId2) should cause error",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.seller.at(
        connection,
        {
          orderCode: order.order_code,
          orderItemId: secondOrderItem.id,
        },
      );
    },
  );
}
