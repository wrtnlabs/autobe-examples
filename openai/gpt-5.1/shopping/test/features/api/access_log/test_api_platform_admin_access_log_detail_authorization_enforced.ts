import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccessLog";
import type { IShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessLog";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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

export async function test_api_platform_admin_access_log_detail_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin (join)
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: "AdminPass!123",
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 2. Register and authenticate seller
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.test.com`,
    password: "SellerPass!123",
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 3. Create base catalog data as platform admin: brand and category tree
  const brandCreateBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.test.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog",
    description: "Main category tree for tests",
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

  // 4. Create a product as seller
  // Switch to seller context by logging in explicitly
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // 5. Create option type and value under seller product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 6. Create SKU for seller product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: "Red Variant",
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sellerSku);

  // 7. Create inventory for seller SKU
  const inventoryCreateBody = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 8. Register and authenticate customer
  const customerEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(8)}@customer.test.com` as string &
      tags.Format<"email">;

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass!123",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerPassword = customerJoinBody.password;

  // 9. Customer creates a cart
  const customerCartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
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

  // 10. Customer adds item to cart
  const cartItemCreateBody = {
    skuId: sellerSku.id,
    quantity: 1,
    note: "Test item",
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

  // 11. Customer creates order based on cart
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
    customer_note: "Test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 12. Switch back to platform admin via login to search access logs
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 13. Search access logs for any record (prefer actorType customer)
  const nowIso = new Date().toISOString();
  const fromIso = new Date(Date.now() - 1000 * 60 * 60).toISOString();

  const searchBodyPreferred = {
    from: fromIso,
    to: nowIso,
    httpMethods: undefined,
    pathPrefix: undefined,
    statusCodeMin: undefined,
    statusCodeMax: undefined,
    minLatencyMs: undefined,
    maxLatencyMs: undefined,
    ipAddress: undefined,
    actorType: "customer",
    actorId: undefined,
    actorRole: undefined,
    success: undefined,
    requestId: undefined,
    correlationId: undefined,
    page: undefined,
    pageSize: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallAccessLog.IRequest;

  let page: IPageIShoppingMallAccessLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.accessLogs.index(
      connection,
      {
        body: searchBodyPreferred,
      },
    );
  typia.assert(page);

  if (!page.data.length) {
    const searchBodyFallback = {
      from: fromIso,
      to: nowIso,
      httpMethods: undefined,
      pathPrefix: undefined,
      statusCodeMin: undefined,
      statusCodeMax: undefined,
      minLatencyMs: undefined,
      maxLatencyMs: undefined,
      ipAddress: undefined,
      actorType: undefined,
      actorId: undefined,
      actorRole: undefined,
      success: undefined,
      requestId: undefined,
      correlationId: undefined,
      page: undefined,
      pageSize: undefined,
      sortBy: undefined,
      sortDirection: undefined,
    } satisfies IShoppingMallAccessLog.IRequest;

    page = await api.functional.shoppingMall.platformAdmin.accessLogs.index(
      connection,
      {
        body: searchBodyFallback,
      },
    );
    typia.assert(page);
  }

  const firstLogSummary: IShoppingMallAccessLog.ISummary | undefined =
    page.data[0];

  await TestValidator.predicate(
    "access log search should return at least one entry",
    async () => firstLogSummary !== undefined,
  );

  if (!firstLogSummary) return;

  const accessLogId = firstLogSummary.id;

  // 14. Unauthenticated request should fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to access log detail must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.accessLogs.at(
        unauthConnection,
        { accessLogId },
      );
    },
  );

  // 15. Customer-authenticated request should fail
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  await TestValidator.error(
    "customer-authenticated access to admin access log detail must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.accessLogs.at(
        connection,
        { accessLogId },
      );
    },
  );

  // 16. Platform admin-authenticated request should succeed
  const adminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const detail: IShoppingMallAccessLog =
    await api.functional.shoppingMall.platformAdmin.accessLogs.at(connection, {
      accessLogId,
    });
  typia.assert(detail);

  TestValidator.equals(
    "detail id must match selected summary id",
    detail.id,
    firstLogSummary.id,
  );

  await TestValidator.predicate(
    "detail path should be non-empty",
    async () => detail.path.length > 0,
  );

  await TestValidator.predicate(
    "detail http_method should be a known verb",
    async () =>
      ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(detail.http_method),
  );
}
