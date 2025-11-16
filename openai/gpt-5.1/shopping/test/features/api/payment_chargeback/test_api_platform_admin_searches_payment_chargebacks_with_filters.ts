import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentChargeback";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate platform admin chargeback search with rich filters and pagination.
 *
 * Business flow:
 *
 * 1. Create a platform admin, seller, and customer through their join APIs.
 * 2. As platform admin, create a category tree, brand, product, and SKU that will
 *    be used for an order and subsequent payment transaction.
 * 3. As seller, create an additional product, option type, option value, SKU, and
 *    inventory item to demonstrate multi-actor catalog management (not strictly
 *    required for the chargeback flow but exercises seller endpoints).
 * 4. As customer, create a cart, add an item that references the admin product
 *    SKU, and create a master order using simple, consistent monetary
 *    snapshots.
 * 5. As platform admin, create a payment method and a payment transaction for the
 *    order.
 * 6. As platform admin, create multiple payment chargebacks tied to that
 *    transaction and order with different status and reasonCode values.
 * 7. Call PATCH /shoppingMall/platformAdmin/paymentChargebacks with
 *    IShoppingMallPaymentChargeback.IRequest filters (transaction id, order id,
 *    statusList, reasonCodeList, caseReference) and assert that only the
 *    matching chargebacks are returned and that pagination metadata is
 *    self-consistent.
 */
export async function test_api_platform_admin_searches_payment_chargebacks_with_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: "AdminPass123!",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register and authenticate seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerSummary: IShoppingMallSeller.ISummary = sellerAuthorized.seller;

  // 3. Register and authenticate customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerSummary: IShoppingMallCustomer.ISummary =
    customerAuthorized.customer;

  // NOTE: connection.headers are automatically managed by SDK auth calls.

  // 4. As platform admin, create category tree and brand and admin product+SKU
  // Ensure we are authenticated as platform admin
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass123!",
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Category tree
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // Brand
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Admin-owned product: associate with sellerSummary (required seller id) and brand
  const adminProductCode =
    `ADMIN-P-${RandomGenerator.alphaNumeric(6)}` as string;

  const adminProductCreateBody = {
    shopping_mall_seller_id: sellerSummary.id,
    shopping_mall_brand_id: brand.id,
    code: adminProductCode,
    name: RandomGenerator.name(2),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.jpg",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductCreateBody,
      },
    );
  typia.assert(adminProduct);

  // Admin product SKU
  const adminSkuCode = `ADMIN-SKU-${RandomGenerator.alphaNumeric(6)}` as string;

  const adminSkuCreateBody = {
    code: adminSkuCode,
    name: RandomGenerator.name(2),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const adminSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: adminProduct.code,
        body: adminSkuCreateBody,
      },
    );
  typia.assert(adminSku);

  // 5. As seller, create own product, option type, option value, sku, inventory
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const sellerProductCode =
    `SELLER-P-${RandomGenerator.alphaNumeric(6)}` as string;

  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerSummary.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode,
    name: RandomGenerator.name(2),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/seller-product.jpg",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // Option type under seller product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // Option value under option type
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // Seller SKU
  const sellerSkuCode =
    `SELLER-SKU-${RandomGenerator.alphaNumeric(6)}` as string;

  const sellerSkuCreateBody = {
    code: sellerSkuCode,
    name: RandomGenerator.name(2),
    listPrice: 50,
    salePrice: 40,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: sellerSkuCreateBody,
    });
  typia.assert(sellerSku);

  // Inventory item for seller SKU
  const inventoryCreateBody = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 6. As customer, create cart, add admin SKU item, and create order
  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  const cartItemCreateBody = {
    skuId: adminSku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "admin sku item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // Build simple pricing snapshot consistent with 1 line item @ 80 USD
  const itemsSubtotal = 80;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal + shippingTotal + taxTotal - discountTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    // For the purpose of this e2e test, just use random UUIDs for address ids
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "e2e test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. As platform admin, create payment method and payment transaction
  const adminReLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLogin);

  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(8)}`;

  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Credit Card",
    description: "E2E test payment method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodCreateBody,
      },
    );
  typia.assert(paymentMethod);

  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: undefined,
    providerName: "test-gateway",
    providerTransactionId: RandomGenerator.alphaNumeric(16),
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: grandTotal,
    paymentStatus: "payment_authorized",
    providerStatus: "authorized",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: undefined,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionCreateBody,
      },
    );
  typia.assert(paymentTransaction);

  // 8. Create chargebacks with different statuses and reasons
  const baseCaseRefPrefix = `CB-${RandomGenerator.alphaNumeric(6)}`;

  const chargebackOpenCreateBody = {
    paymentTransactionId: paymentTransaction.id,
    orderId: order.id,
    caseReference: `${baseCaseRefPrefix}-OPEN`,
    providerCaseId: RandomGenerator.alphaNumeric(10),
    disputedAmount: 40,
    currency: paymentTransaction.currency,
    status: "chargeback_open",
    reasonCode: "fraud",
    reasonMessage: "Fraudulent transaction suspected",
    openedAt: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const chargebackOpen: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      {
        body: chargebackOpenCreateBody,
      },
    );
  typia.assert(chargebackOpen);

  const chargebackOtherCreateBody = {
    paymentTransactionId: paymentTransaction.id,
    orderId: order.id,
    caseReference: `${baseCaseRefPrefix}-OTHER`,
    providerCaseId: RandomGenerator.alphaNumeric(10),
    disputedAmount: 20,
    currency: paymentTransaction.currency,
    status: "chargeback_closed",
    reasonCode: "product_not_received",
    reasonMessage: "Customer claims non-receipt",
    openedAt: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const chargebackOther: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      {
        body: chargebackOtherCreateBody,
      },
    );
  typia.assert(chargebackOther);

  // 9. Search chargebacks filtered by transaction + order + status + reasonCode
  const searchRequestOpenFraud = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortBy: "createdAt",
    sortDirection: "desc" as const,
    statusList: ["chargeback_open"],
    reasonCodeList: ["fraud"],
    paymentTransactionId: paymentTransaction.id,
    orderId: order.id,
    caseReference: undefined,
    providerCaseId: undefined,
    financialInstitutionReference: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    resolvedFrom: undefined,
    resolvedTo: undefined,
    q: undefined,
  } satisfies IShoppingMallPaymentChargeback.IRequest;

  const pageOpenFraud: IPageIShoppingMallPaymentChargeback.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.index(
      connection,
      {
        body: searchRequestOpenFraud,
      },
    );
  typia.assert(pageOpenFraud);

  const paginationOpenFraud = pageOpenFraud.pagination;

  TestValidator.predicate(
    "open+fraud search should return at least one record",
    paginationOpenFraud.records >= 1 && pageOpenFraud.data.length >= 1,
  );

  for (const summary of pageOpenFraud.data) {
    // Ensure transaction and order match
    TestValidator.equals(
      "payment transaction id matches filter",
      summary.paymentTransaction.order_id,
      paymentTransaction.id,
    );
    TestValidator.equals("order id matches filter", summary.order.id, order.id);
    TestValidator.equals(
      "status matches filter",
      summary.status,
      "chargeback_open",
    );
    TestValidator.equals(
      "reason code matches filter",
      summary.reason_code,
      "fraud",
    );
  }

  // 10. Search with broader filters including both chargebacks
  const searchRequestAllForTransaction = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortBy: "createdAt",
    sortDirection: "desc" as const,
    statusList: ["chargeback_open", "chargeback_closed"],
    reasonCodeList: ["fraud", "product_not_received"],
    paymentTransactionId: paymentTransaction.id,
    orderId: order.id,
    caseReference: undefined,
    providerCaseId: undefined,
    financialInstitutionReference: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    resolvedFrom: undefined,
    resolvedTo: undefined,
    q: undefined,
  } satisfies IShoppingMallPaymentChargeback.IRequest;

  const pageAll: IPageIShoppingMallPaymentChargeback.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.index(
      connection,
      {
        body: searchRequestAllForTransaction,
      },
    );
  typia.assert(pageAll);

  const statuses = new Set<string>();
  const reasons = new Set<string>();

  for (const summary of pageAll.data) {
    statuses.add(summary.status);
    reasons.add(summary.reason_code);
  }

  TestValidator.predicate(
    "broader search should include at least two chargebacks",
    pageAll.data.length >= 2,
  );

  TestValidator.predicate(
    "status set includes both open and closed",
    statuses.has("chargeback_open") && statuses.has("chargeback_closed"),
  );

  TestValidator.predicate(
    "reason code set includes both fraud and product_not_received",
    reasons.has("fraud") && reasons.has("product_not_received"),
  );

  // 11. Search by exact case reference (should return exactly one)
  const searchByCaseReference = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortBy: "createdAt",
    sortDirection: "desc" as const,
    statusList: undefined,
    reasonCodeList: undefined,
    paymentTransactionId: paymentTransaction.id,
    orderId: order.id,
    caseReference: chargebackOpen.caseReference,
    providerCaseId: undefined,
    financialInstitutionReference: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    resolvedFrom: undefined,
    resolvedTo: undefined,
    q: undefined,
  } satisfies IShoppingMallPaymentChargeback.IRequest;

  const pageByCaseRef: IPageIShoppingMallPaymentChargeback.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.index(
      connection,
      {
        body: searchByCaseReference,
      },
    );
  typia.assert(pageByCaseRef);

  TestValidator.predicate(
    "search by caseReference returns at least one record",
    pageByCaseRef.data.length >= 1,
  );

  const foundByCaseRef = pageByCaseRef.data.find(
    (s) => s.reason_code === chargebackOpen.reasonCode,
  );

  TestValidator.predicate(
    "search by caseReference contains an entry matching open chargeback",
    foundByCaseRef !== undefined,
  );
}
