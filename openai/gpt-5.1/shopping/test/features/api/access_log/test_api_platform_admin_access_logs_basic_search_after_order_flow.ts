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

export async function test_api_platform_admin_access_logs_basic_search_after_order_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin via /auth/platformAdmin/join
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register and authenticate a seller via /auth/seller/join
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. As seller, create a product
  const sellerProductCode = `SP-${RandomGenerator.alphaNumeric(10)}`;
  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: sellerProductCode,
    name: `Seller Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  // 4. As platform admin, create a brand
  const brandBody = {
    name: `Brand-${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.test.com/logos/brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  // switch back to platform admin (login), to simulate actor switching clearly
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const loggedInAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(loggedInAdmin);

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. As platform admin, create another admin-managed product and SKU (noise)
  const adminProductCode = `AP-${RandomGenerator.alphaNumeric(10)}`;
  const adminProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: adminProductCode,
    name: `Admin Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductBody,
      },
    );
  typia.assert(adminProduct);

  const adminSkuBody = {
    code: `AP-SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: `Admin SKU ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9500,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const adminSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: adminProduct.code,
        body: adminSkuBody,
      },
    );
  typia.assert(adminSku);

  // 6. As seller, optionally define option types/values for seller product and create SKU
  const sellerOptionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  // switch back to seller actor for catalog operations
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(loggedInSeller);

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: sellerOptionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "L",
    display_name: "Large",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  const sellerSkuBody = {
    code: `SP-SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: `Seller SKU ${RandomGenerator.name(1)}`,
    listPrice: 5000,
    salePrice: 4500,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: sellerSkuBody,
    });
  typia.assert(sellerSku);

  // 7. Create an inventory item for sellerSku
  const inventoryBody = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 8. Create and authenticate a customer, then create a cart
  const customerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@customer.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
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
        body: cartBody,
      },
    );
  typia.assert(cart);

  // 9. As customer, add SKU to cart and place an order
  const addItemBody = {
    skuId: sellerSku.id,
    quantity: 1,
    note: "test line item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: addItemBody,
      },
    );
  typia.assert(cartItem);

  // Capture a time window around order creation for log filtering
  const fromTime = new Date().toISOString();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "e2e test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  const toTime = new Date().toISOString();

  // 10. Switch back to platform admin and query access logs
  const adminLoginForLogsBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.test.com/access-logs",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminForLogs: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginForLogsBody,
    });
  typia.assert(adminForLogs);

  const logRequestBody = {
    from: fromTime,
    to: toTime,
    httpMethods: ["POST"],
    pathPrefix: "/shoppingMall/customer/orders",
    actorType: "customer",
    actorId: customerAuthorized.id,
    page: 1,
    pageSize: 50,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallAccessLog.IRequest;

  const logsPage: IPageIShoppingMallAccessLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.accessLogs.index(
      connection,
      {
        body: logRequestBody,
      },
    );
  typia.assert(logsPage);

  const pagination: IPage.IPagination = logsPage.pagination;
  const entries: IShoppingMallAccessLog.ISummary[] = logsPage.data;

  // 11. Assert pagination metadata coherence
  TestValidator.predicate(
    "pagination.records should be >= data length",
    pagination.records >= entries.length,
  );
  TestValidator.predicate(
    "pagination.limit should be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    pagination.pages >= 0,
  );

  if (pagination.records > 0) {
    TestValidator.predicate(
      "pagination.pages should be >= 1 when records > 0",
      pagination.pages >= 1,
    );
  }

  // 12. Verify that there is at least one access log matching the order creation endpoint
  const hasOrderLog = entries.some((entry) => {
    const methodMatches = entry.http_method.toUpperCase() === "POST";
    const pathMatches = entry.path.includes("/shoppingMall/customer/orders");
    const actorTypeMatches =
      entry.actor_type === undefined || entry.actor_type === "customer";
    const actorIdMatches =
      entry.actor_id === undefined || entry.actor_id === customerAuthorized.id;
    return methodMatches && pathMatches && actorTypeMatches && actorIdMatches;
  });

  TestValidator.predicate(
    "access logs should contain at least one POST /shoppingMall/customer/orders entry for the customer in the given time window",
    hasOrderLog,
  );
}
