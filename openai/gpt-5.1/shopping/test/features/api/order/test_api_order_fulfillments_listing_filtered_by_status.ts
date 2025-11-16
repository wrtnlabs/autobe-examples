import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFulfillment";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillment";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallFulfillmentOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentOrderLine";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";

export async function test_api_order_fulfillments_listing_filtered_by_status(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (ensure token-based auth works and simulate real flow)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Seller joins
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.local/login",
    referrer: "https://seller.test.local/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Platform admin login again before catalog configuration (ensure we are in admin context)
  const platformAdminLogin2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin2);

  // 6. Create category tree
  const categoryTreeCode: string = RandomGenerator.alphaNumeric(12);
  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
    description: "Primary category tree for tests",
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

  // 7. Create brand
  const brandSlug: string = RandomGenerator.alphaNumeric(10);
  const brandCreateBody = {
    name: "Test Brand",
    slug: brandSlug,
    description: "Brand for fulfillment filter tests",
    logo_uri: "https://cdn.test.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 8. Create product
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Fulfillment Filter Test Product",
    short_description: "A product used to test fulfillment listing filters",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.local/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 9. Create SKU under the product
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: "Default SKU",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 10. Seller login before inventory creation
  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin2);

  // 11. Create inventory item for SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 12. Customer joins
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.test.local/join",
    referrer: "https://shop.test.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 13. Customer login
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.test.local/login",
    referrer: "https://shop.test.local/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 14. Create customer cart
  const customerCartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "fulfillment-filter-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  // 15. Add item to cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 2,
    note: "Test line for fulfillment filters",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 16. Create order from cart
  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: customerCart.subtotal_amount,
    discount_total_amount: customerCart.discount_amount,
    shipping_total_amount: customerCart.shipping_amount,
    tax_total_amount: customerCart.tax_amount,
    grand_total_amount: customerCart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 17. Seller login again before creating seller-side fulfillment
  const sellerLoginForFulfillment: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginForFulfillment);

  // 18. Create seller-side fulfillment for the order
  const sellerFulfillmentCreateBody = {
    order_line_fulfillments: [
      {
        // For a realistic implementation, this would reference a known order_line_id.
        // In this generated test, we use a random UUID because order line IDs are not exposed.
        order_line_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
      },
    ],
    carrier_code: "UPS",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "WH-SELLER-1",
    notes: "Seller-side fulfillment",
  } satisfies IShoppingMallFulfillment.ICreate;
  const sellerFulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: sellerFulfillmentCreateBody,
      },
    );
  typia.assert(sellerFulfillment);

  // 19. Platform admin login again and create admin-side fulfillment
  const platformAdminLoginForFulfillment: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginForFulfillment);

  const adminFulfillmentCreateBody = {
    order_line_fulfillments: [
      {
        order_line_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
      },
    ],
    carrier_code: "FEDEX",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "WH-ADMIN-1",
    notes: "Platform-admin-side fulfillment",
  } satisfies IShoppingMallFulfillment.ICreate;
  const adminFulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.platformAdmin.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: adminFulfillmentCreateBody,
      },
    );
  typia.assert(adminFulfillment);

  const sellerStatus: string = sellerFulfillment.status;
  const adminStatus: string = adminFulfillment.status;

  // 20. Call index endpoint filtered by seller status
  const sellerStatusRequestBody = {
    page: 1,
    limit: 10,
    status: sellerStatus,
  } satisfies IShoppingMallFulfillment.IRequest;
  const sellerStatusPage: IPageIShoppingMallFulfillment.ISummary =
    await api.functional.shoppingMall.orders.fulfillments.index(connection, {
      orderId: order.id,
      body: sellerStatusRequestBody,
    });
  typia.assert(sellerStatusPage);

  const sellerPagination: IPage.IPagination = sellerStatusPage.pagination;
  TestValidator.predicate(
    "seller-status pagination limit should be >= data length",
    sellerStatusPage.data.length <= sellerPagination.limit,
  );

  if (sellerStatusPage.data.length > 0) {
    TestValidator.predicate(
      "seller-status records should be >= 1",
      sellerPagination.records >= 1,
    );
  }

  for (const summary of sellerStatusPage.data) {
    typia.assert<IShoppingMallFulfillment.ISummary>(summary);
    TestValidator.equals(
      "summary order id must match target order",
      summary.order.id,
      order.id,
    );
    TestValidator.equals(
      "summary status must equal seller filter status",
      summary.status,
      sellerStatus,
    );
  }

  const foundSellerSummary = sellerStatusPage.data.find(
    (f) => f.id === sellerFulfillment.id,
  );
  TestValidator.predicate(
    "seller fulfillment should appear in seller-status filtered result",
    foundSellerSummary !== undefined,
  );

  if (adminStatus !== sellerStatus) {
    const foundAdminInSellerFilter = sellerStatusPage.data.find(
      (f) => f.id === adminFulfillment.id,
    );
    TestValidator.predicate(
      "admin fulfillment should not appear when filtering by seller status",
      foundAdminInSellerFilter === undefined,
    );
  }

  // 21. Call index endpoint filtered by admin status
  const adminStatusRequestBody = {
    page: 1,
    limit: 10,
    status: adminStatus,
  } satisfies IShoppingMallFulfillment.IRequest;
  const adminStatusPage: IPageIShoppingMallFulfillment.ISummary =
    await api.functional.shoppingMall.orders.fulfillments.index(connection, {
      orderId: order.id,
      body: adminStatusRequestBody,
    });
  typia.assert(adminStatusPage);

  const adminPagination: IPage.IPagination = adminStatusPage.pagination;
  TestValidator.predicate(
    "admin-status pagination limit should be >= data length",
    adminStatusPage.data.length <= adminPagination.limit,
  );

  if (adminStatusPage.data.length > 0) {
    TestValidator.predicate(
      "admin-status records should be >= 1",
      adminPagination.records >= 1,
    );
  }

  for (const summary of adminStatusPage.data) {
    typia.assert<IShoppingMallFulfillment.ISummary>(summary);
    TestValidator.equals(
      "summary order id must match target order (admin filter)",
      summary.order.id,
      order.id,
    );
    TestValidator.equals(
      "summary status must equal admin filter status",
      summary.status,
      adminStatus,
    );
  }

  const foundAdminSummary = adminStatusPage.data.find(
    (f) => f.id === adminFulfillment.id,
  );
  TestValidator.predicate(
    "admin fulfillment should appear in admin-status filtered result",
    foundAdminSummary !== undefined,
  );

  if (adminStatus !== sellerStatus) {
    const foundSellerInAdminFilter = adminStatusPage.data.find(
      (f) => f.id === sellerFulfillment.id,
    );
    TestValidator.predicate(
      "seller fulfillment should not appear when filtering by admin status",
      foundSellerInAdminFilter === undefined,
    );
  }

  // 22. Negative filter: use status that matches no fulfillment
  const negativeStatus: string = `${sellerStatus}-NEGATIVE`;
  const negativeStatusRequestBody = {
    page: 1,
    limit: 10,
    status: negativeStatus,
  } satisfies IShoppingMallFulfillment.IRequest;
  const negativeStatusPage: IPageIShoppingMallFulfillment.ISummary =
    await api.functional.shoppingMall.orders.fulfillments.index(connection, {
      orderId: order.id,
      body: negativeStatusRequestBody,
    });
  typia.assert(negativeStatusPage);

  const negativePagination: IPage.IPagination = negativeStatusPage.pagination;
  TestValidator.equals(
    "negative-status data array should be empty",
    negativeStatusPage.data.length,
    0,
  );
  TestValidator.equals(
    "negative-status records should be zero",
    negativePagination.records,
    0,
  );
}
