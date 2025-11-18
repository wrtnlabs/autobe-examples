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
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerOrderMetricsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOrderMetricsSnapshot";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate seller order metrics snapshot filters by sellerIds and GMV
 * thresholds.
 *
 * This scenario wires a realistic multi-actor environment (admin, two sellers,
 * one customer) and then focuses on verifying that PATCH
 * /shoppingMall/admin/sellerOrderMetricsSnapshots respects:
 *
 * - SellerIds scoping
 * - MinGmvAmount and maxGmvAmount filters
 *
 * Steps:
 *
 * 1. Admin joins to obtain admin authorization.
 * 2. Admin creates foundational master data: country, region, category,
 *    skuInventoryState, shippingMethod, paymentMethod.
 * 3. Seller A joins and logs in, then creates a warehouse, product, and SKU
 *    (high-priced) to conceptually yield higher GMV.
 * 4. Seller B joins and logs in, then creates its own warehouse, product, and SKU
 *    (lower-priced) to conceptually yield lower GMV.
 * 5. Customer joins and logs in, then creates a cart and a shipping address. Two
 *    orders are created referencing the SKUs; this makes the scenario realistic
 *    even though the snapshot table is populated independently.
 * 6. Admin logs in again and calls sellerOrderMetricsSnapshots.index with a
 *    request body that includes only Seller A in sellerIds and a minGmvAmount
 *    chosen between low and high conceptual GMV bands. The test asserts that
 *    every returned snapshot belongs to Seller A and has gmv_amount >=
 *    minGmvAmount.
 * 7. Admin then calls the same endpoint with sellerIds including both sellers and
 *    a maxGmvAmount that is lower; the test asserts that all snapshots belong
 *    to either Seller A or Seller B and that each gmv_amount <= maxGmvAmount.
 *    If any snapshot for Seller B exists, the test confirms the GMV constraints
 *    hold using only response data.
 */
export async function test_api_seller_order_metrics_snapshot_filter_by_seller_and_gmv_threshold(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates master data
  const countryBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
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
    slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Electronics",
    description_en: "Electronics category for tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const skuInventoryStateBody = {
    code: `IN_STOCK_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Purchasable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuInventoryState);

  const shippingMethodBody = {
    method_code: `STD_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: `CARD_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Credit Card",
    description: "Test card method",
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

  // 3. Seller A joins and logs in
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  const sellerALoginBody = {
    email: sellerAAuth.email,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/login",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin);

  // Seller A warehouse
  const sellerAWarehouseBody = {
    code: `A_WH_${RandomGenerator.alphaNumeric(4)}`,
    name: "Seller A Main Warehouse",
    description: "Primary warehouse for Seller A",
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const sellerAWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: sellerAWarehouseBody,
      },
    );
  typia.assert(sellerAWarehouse);

  // Seller A product and SKU (high price)
  const sellerAProductBody = {
    code: `A_PROD_${RandomGenerator.alphaNumeric(4)}`,
    title: "High GMV Product A",
    summary: "High price product for Seller A",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    brand: "TestBrandA",
    model_name: "ModelA-1",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const sellerAProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerAProductBody,
    });
  typia.assert(sellerAProduct);

  const sellerASkuBody = {
    code: `A_SKU_${RandomGenerator.alphaNumeric(4)}`,
    barcode: null,
    status: "active",
    price: 500,
    original_price: 550,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sellerASku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: sellerAProduct.id as string & tags.Format<"uuid">,
      body: sellerASkuBody,
    });
  typia.assert(sellerASku);

  // 4. Seller B joins and logs in
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-b.example.com/join",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  const sellerBLoginBody = {
    email: sellerBAuth.email,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://seller-b.example.com/login",
    referrer: "https://seller-b.example.com/login",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLogin);

  // Seller B warehouse
  const sellerBWarehouseBody = {
    code: `B_WH_${RandomGenerator.alphaNumeric(4)}`,
    name: "Seller B Main Warehouse",
    description: "Primary warehouse for Seller B",
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const sellerBWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: sellerBWarehouseBody,
      },
    );
  typia.assert(sellerBWarehouse);

  // Seller B product and SKU (low price)
  const sellerBProductBody = {
    code: `B_PROD_${RandomGenerator.alphaNumeric(4)}`,
    title: "Low GMV Product B",
    summary: "Low price product for Seller B",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    brand: "TestBrandB",
    model_name: "ModelB-1",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const sellerBProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerBProductBody,
    });
  typia.assert(sellerBProduct);

  const sellerBSkuBody = {
    code: `B_SKU_${RandomGenerator.alphaNumeric(4)}`,
    barcode: null,
    status: "active",
    price: 50,
    original_price: 60,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sellerBSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: sellerBProduct.id as string & tags.Format<"uuid">,
      body: sellerBSkuBody,
    });
  typia.assert(sellerBSku);

  // 5. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerAuth.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/login",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // Customer cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // Customer address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressBody,
      },
    );
  typia.assert(customerAddress);

  // Helper: build order body; note that cart_id and some fields may be null
  const buildOrderBody = (
    skuId: string & tags.Format<"uuid">,
    quantity: number & tags.Type<"int32">,
  ) => {
    const shippingSnapshot = {
      recipient_name: "Test Customer",
      phone_number: RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: "06236",
      state_or_region: region.code,
      city: "Seoul",
      address_line1: "123 Test Street",
      address_line2: null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

    const orderItem: IShoppingMallOrderItem.ICreate = {
      shopping_mall_sku_id: skuId,
      quantity,
    };

    const body = {
      cart_id: cart.id,
      currency_code: "KRW",
      items: [orderItem],
      shipping_address_id: customerAddress.id,
      shipping_address_snapshot: shippingSnapshot,
      shipping_method_id: shippingMethod.id,
      payment_method_id: paymentMethod.id,
      buyer_memo: null,
      platform_note: null,
    } satisfies IShoppingMallOrder.ICreate;

    return body;
  };

  // Orders for Seller A and Seller B (conceptual GMV separation)
  const orderA1: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: buildOrderBody(
        sellerASku.id as string & tags.Format<"uuid">,
        2 as number & tags.Type<"int32">,
      ),
    });
  typia.assert(orderA1);

  const orderB1: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: buildOrderBody(
        sellerBSku.id as string & tags.Format<"uuid">,
        1 as number & tags.Type<"int32">,
      ),
    });
  typia.assert(orderB1);

  // 6. Admin logs in again before metrics queries
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Prepare snapshot time range around now
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  // Choose GMV thresholds (conceptual band)
  const highGmv = 500 * 2; // Seller A approx GMV
  const lowGmv = 50 * 1; // Seller B approx GMV
  const minGmvForA = (highGmv + lowGmv) / 2;
  const maxGmvForB = lowGmv + 10;

  // 7. First analytics call: filter by Seller A with minGmvAmount
  const firstRequestBody = {
    sellerIds: [sellerALogin.id as string & tags.Format<"uuid">],
    snapshotDateFrom: from,
    snapshotDateTo: to,
    timezone: "Asia/Seoul",
    minGmvAmount: minGmvForA,
    maxGmvAmount: undefined,
    minOrdersCancelledCount: undefined,
    maxOrdersCancelledCount: undefined,
    minOrdersRefundedCount: undefined,
    maxOrdersRefundedCount: undefined,
    sortBy: "snapshotDate",
    sortDirection: "desc",
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSellerOrderMetricsSnapshot.IRequest;

  const firstPage: IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.index(
      connection,
      {
        body: firstRequestBody,
      },
    );
  typia.assert(firstPage);

  // Validate sellerIds scoping and minGmvAmount
  const firstData = firstPage.data;

  await ArrayUtil.asyncForEach(firstData, async (row) => {
    TestValidator.equals(
      "first query - seller must be Seller A",
      row.seller.id,
      sellerALogin.id,
    );

    TestValidator.predicate(
      "first query - gmv_amount must be >= minGmvAmount",
      row.gmv_amount >= minGmvForA,
    );
  });

  // 8. Second analytics call: both sellers with maxGmvAmount
  const secondRequestBody = {
    sellerIds: [
      sellerALogin.id as string & tags.Format<"uuid">,
      sellerBLogin.id as string & tags.Format<"uuid">,
    ],
    snapshotDateFrom: from,
    snapshotDateTo: to,
    timezone: "Asia/Seoul",
    minGmvAmount: undefined,
    maxGmvAmount: maxGmvForB,
    minOrdersCancelledCount: undefined,
    maxOrdersCancelledCount: undefined,
    minOrdersRefundedCount: undefined,
    maxOrdersRefundedCount: undefined,
    sortBy: "snapshotDate",
    sortDirection: "desc",
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSellerOrderMetricsSnapshot.IRequest;

  const secondPage: IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.index(
      connection,
      {
        body: secondRequestBody,
      },
    );
  typia.assert(secondPage);

  const secondData = secondPage.data;

  // Basic per-row validations
  await ArrayUtil.asyncForEach(secondData, async (row) => {
    TestValidator.predicate(
      "second query - seller must be either A or B",
      row.seller.id === sellerALogin.id || row.seller.id === sellerBLogin.id,
    );

    TestValidator.predicate(
      "second query - gmv_amount must be <= maxGmvAmount",
      row.gmv_amount <= maxGmvForB,
    );
  });

  // Additional check: if there is any Seller B row, ensure its GMV respects the max bound
  const sellerBRows = secondData.filter(
    (row) => row.seller.id === sellerBLogin.id,
  );

  if (sellerBRows.length > 0) {
    await ArrayUtil.asyncForEach(sellerBRows, async (row) => {
      TestValidator.predicate(
        "second query - Seller B row gmv_amount within max bound",
        row.gmv_amount <= maxGmvForB,
      );
    });
  }
}
