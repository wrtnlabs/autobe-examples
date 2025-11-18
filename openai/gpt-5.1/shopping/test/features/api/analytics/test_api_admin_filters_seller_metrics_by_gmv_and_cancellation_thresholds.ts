import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerOrderMetricsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerOrderMetricsSnapshot";
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
import type { IShoppingMallSellerOrderMetricsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOrderMetricsSnapshot";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validates that admin seller-order metrics analytics correctly applies numeric
 * filters for GMV and cancellation/refund thresholds.
 *
 * Business flow (simplified and partially assumptive about snapshot data):
 *
 * 1. Create and authenticate an admin account to configure master data and call
 *    the analytics endpoint.
 * 2. Create and authenticate a seller account, then under that seller create:
 *
 *    - One product
 *    - One SKU using an admin-created inventory state
 * 3. Create and authenticate a customer account, then for that customer:
 *
 *    - Create a shipping address
 *    - Create a cart header
 *    - Create an order using a single line item for the seller SKU
 *    - Create a logical payment for the order so that it becomes paid
 * 4. Assume the system’s snapshot generator has produced seller order metrics
 *    snapshots for this seller covering some recent business days.
 * 5. As admin, call PATCH /shoppingMall/admin/analytics/sellerOrderMetrics with a
 *    first filter set:
 *
 *    - SellerIds including the seller id
 *    - SnapshotDateFrom/to as a wide range around “now”
 *    - MinGmvAmount > 0
 *    - MinOrdersCancelledCount and maxOrdersCancelledCount forming a sane band
 *    - MinOrdersRefundedCount and maxOrdersRefundedCount forming a sane band
 * 6. If any snapshots are returned, verify for each that:
 *
 *    - Snapshot.seller.id == seller.id
 *    - Snapshot.gmv_amount >= minGmvAmount
 *    - Cancellation and refund counts fall within the requested min/max bands
 *    - All snapshots share the same seller id and have coherent snapshot_date
 * 7. Issue a second analytics call with a different min/max band configuration
 *    (for example, a much higher minGmvAmount or stricter cancellation band)
 *    and, when snapshots exist, again check that each snapshot respects the new
 *    filters.
 * 8. In all calls, regardless of whether snapshots exist, assert that pagination
 *    metadata is coherent: limits and record counts are non-negative and pages
 *    are consistent with records and limit.
 */
export async function test_api_admin_filters_seller_metrics_by_gmv_and_cancellation_thresholds(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and then logs in for stable analytics context
  const adminJoinEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinPassword: string = RandomGenerator.alphabets(12) + "!1A";

  const adminJoinBody = {
    email: adminJoinEmail,
    password: adminJoinPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // Explicit login to ensure normal login flow also works and token in
  // connection headers is refreshed.
  const adminLoginBody = {
    email: adminJoinEmail,
    password: adminJoinPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Seller joins and logs in
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphabets(12) + "!1B";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const sellerId: string & tags.Format<"uuid"> = sellerLogin.id;

  // 3. Customer joins and logs in
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphabets(12) + "!1C";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const customerId: string & tags.Format<"uuid"> = customerLogin.id;

  // 4. As admin, configure master data needed for orders
  //      - Country
  //      - Region
  //      - Category
  //      - SKU inventory state
  //      - Shipping method
  //      - Payment method

  // Ensure we’re logged in as admin again so that admin-only endpoints
  // are authorized.
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(2).toUpperCase(),
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
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: "Test Category",
    description_en: "Test category for metrics",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const skuInventoryStateCreateBody = {
    code: "in_stock",
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

  const shippingMethodCreateBody = {
    method_code: "standard-test",
    display_name: "Standard Shipping (Test)",
    service_level_description: "Standard test shipping method",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card-test",
    display_name: "Test Card",
    description: "Test payment method",
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

  // 5. Switch to seller and create product + SKU under this seller
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product/test.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Associate product with category via admin endpoint
  const adminAfterProduct: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterProduct);

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

  // Back to seller to create SKU
  const sellerAfterCategory: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterCategory);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer creates address, cart, order, and payment
  const customerRelogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerRelogin);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 100",
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
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

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

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 2 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
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
      body: orderCreateBody,
    });
  typia.assert(order);

  const paymentCreateBody = {
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
        body: paymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 7. As admin, invoke seller order metrics analytics with filters
  const adminBeforeAnalytics: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminBeforeAnalytics);

  const now: Date = new Date();
  const fromDate: Date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const minGmvAmountHigh: number = 10;
  const minCancelled: number & tags.Type<"int32"> = 0 as number &
    tags.Type<"int32">;
  const maxCancelled: number & tags.Type<"int32"> = 100 as number &
    tags.Type<"int32">;
  const minRefunded: number & tags.Type<"int32"> = 0 as number &
    tags.Type<"int32">;
  const maxRefunded: number & tags.Type<"int32"> = 100 as number &
    tags.Type<"int32">;

  const analyticsRequestHigh = {
    sellerIds: [sellerId],
    snapshotDateFrom: fromDate.toISOString() as string &
      tags.Format<"date-time">,
    snapshotDateTo: toDate.toISOString() as string & tags.Format<"date-time">,
    timezone: "Asia/Seoul",
    minGmvAmount: minGmvAmountHigh,
    maxGmvAmount: undefined,
    minOrdersCancelledCount: minCancelled,
    maxOrdersCancelledCount: maxCancelled,
    minOrdersRefundedCount: minRefunded,
    maxOrdersRefundedCount: maxRefunded,
    sortBy: "snapshotDate",
    sortDirection: "desc",
    page: 0 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSellerOrderMetricsSnapshot.IRequest;

  const analyticsHigh: IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerOrderMetrics.index(
      connection,
      {
        body: analyticsRequestHigh,
      },
    );
  typia.assert(analyticsHigh);

  const paginationHigh: IPage.IPagination = analyticsHigh.pagination;
  TestValidator.predicate(
    "pagination (high band) has non-negative values",
    paginationHigh.current >= 0 &&
      paginationHigh.limit >= 0 &&
      paginationHigh.records >= 0 &&
      paginationHigh.pages >= 0,
  );

  TestValidator.predicate(
    "pagination (high band) records cover data length",
    analyticsHigh.data.length <= paginationHigh.records,
  );

  if (analyticsHigh.data.length > 0) {
    await ArrayUtil.asyncForEach(
      analyticsHigh.data,
      async (snapshot: IShoppingMallSellerOrderMetricsSnapshot.ISummary) => {
        TestValidator.equals(
          "snapshot seller id matches filter sellerId (high band)",
          snapshot.seller.id,
          sellerId,
        );

        TestValidator.predicate(
          "snapshot gmv_amount satisfies minGmvAmount (high band)",
          snapshot.gmv_amount >= minGmvAmountHigh,
        );

        TestValidator.predicate(
          "snapshot orders_cancelled_count within [min,max] (high band)",
          snapshot.orders_cancelled_count >= minCancelled &&
            snapshot.orders_cancelled_count <= maxCancelled,
        );

        TestValidator.predicate(
          "snapshot orders_refunded_count within [min,max] (high band)",
          snapshot.orders_refunded_count >= minRefunded &&
            snapshot.orders_refunded_count <= maxRefunded,
        );

        TestValidator.predicate(
          "snapshot snapshot_date within requested range (high band)",
          snapshot.snapshot_date >= analyticsRequestHigh.snapshotDateFrom! &&
            snapshot.snapshot_date <= analyticsRequestHigh.snapshotDateTo!,
        );
      },
    );
  }

  // 8. Second analytics call with stricter GMV filter (very high min GMV)
  const minGmvAmountVeryHigh: number = 100000;

  const analyticsRequestVeryHigh = {
    sellerIds: [sellerId],
    snapshotDateFrom: fromDate.toISOString() as string &
      tags.Format<"date-time">,
    snapshotDateTo: toDate.toISOString() as string & tags.Format<"date-time">,
    timezone: "Asia/Seoul",
    minGmvAmount: minGmvAmountVeryHigh,
    maxGmvAmount: undefined,
    minOrdersCancelledCount: undefined,
    maxOrdersCancelledCount: undefined,
    minOrdersRefundedCount: undefined,
    maxOrdersRefundedCount: undefined,
    sortBy: "gmvAmount",
    sortDirection: "desc",
    page: 0 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSellerOrderMetricsSnapshot.IRequest;

  const analyticsVeryHigh: IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerOrderMetrics.index(
      connection,
      {
        body: analyticsRequestVeryHigh,
      },
    );
  typia.assert(analyticsVeryHigh);

  const paginationVeryHigh: IPage.IPagination = analyticsVeryHigh.pagination;

  TestValidator.predicate(
    "pagination (very high GMV band) has non-negative values",
    paginationVeryHigh.current >= 0 &&
      paginationVeryHigh.limit >= 0 &&
      paginationVeryHigh.records >= 0 &&
      paginationVeryHigh.pages >= 0,
  );

  TestValidator.predicate(
    "pagination (very high GMV band) records cover data length",
    analyticsVeryHigh.data.length <= paginationVeryHigh.records,
  );

  if (analyticsVeryHigh.data.length > 0) {
    await ArrayUtil.asyncForEach(
      analyticsVeryHigh.data,
      async (snapshot: IShoppingMallSellerOrderMetricsSnapshot.ISummary) => {
        TestValidator.equals(
          "snapshot seller id matches filter sellerId (very high band)",
          snapshot.seller.id,
          sellerId,
        );

        TestValidator.predicate(
          "snapshot gmv_amount satisfies very high minGmvAmount",
          snapshot.gmv_amount >= minGmvAmountVeryHigh,
        );

        TestValidator.predicate(
          "snapshot snapshot_date within requested range (very high band)",
          snapshot.snapshot_date >=
            analyticsRequestVeryHigh.snapshotDateFrom! &&
            snapshot.snapshot_date <= analyticsRequestVeryHigh.snapshotDateTo!,
        );
      },
    );
  }
}
