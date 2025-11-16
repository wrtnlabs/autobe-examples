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

export async function test_api_platform_admin_access_log_detail_matches_summary_and_request_context(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates and sets Authorization header)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Register seller and login as seller
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);

  // (Optional explicit login to exercise login flow and generate more logs)
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerJoinInput.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLoginAuthorized);

  // 3. Register customer and login as customer
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuthorized);

  const customerLoginInput = {
    email: customerJoinInput.email,
    password: customerJoinInput.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Tester/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginInput,
    });
  typia.assert(customerLoginAuthorized);

  // 4. As platform admin, create catalog scaffolding (category tree + brand)
  // Switch back to admin (login) to ensure admin context for subsequent admin-only calls
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoginAuthorized);

  const categoryTreeCreateInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateInput,
      },
    );
  typia.assert(categoryTree);

  const brandCreateInput = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateInput,
    });
  typia.assert(brand);

  // 5. As seller, create a product, option type, option value, SKU, and inventory
  const productCreateInputForSeller = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-main.jpg" as string &
      tags.Format<"uri">,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateInputForSeller,
    });
  typia.assert(sellerProduct);

  const optionTypeCreateInput = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateInput,
      },
    );
  typia.assert(optionType);

  const optionValueCreateInput = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateInput,
      },
    );
  typia.assert(optionValue);

  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateInputForSeller = {
    code: skuCode,
    name: `${sellerProduct.name} ${optionValue.value}`,
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: skuCreateInputForSeller,
    });
  typia.assert(sellerSku);

  const inventoryCreateInput = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateInput,
    });
  typia.assert(inventoryItem);

  // 6. As platform admin, create an additional product/SKU as admin-managed product
  const productCreateInputForAdmin = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/admin-product-main.jpg" as string &
        tags.Format<"uri">,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateInputForAdmin,
      },
    );
  typia.assert(adminProduct);

  const skuCreateInputForAdmin = {
    code: RandomGenerator.alphaNumeric(10),
    name: `${adminProduct.name} Single`,
    listPrice: 200,
    salePrice: 180,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const adminSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: adminProduct.code,
        body: skuCreateInputForAdmin,
      },
    );
  typia.assert(adminSku);

  // 7. As customer, create cart, add item, and create order to generate access logs
  const customerCartCreateInput = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateInput,
      },
    );
  typia.assert(customerCart);

  const cartItemCreateInput = {
    skuId: sellerSku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateInput,
      },
    );
  typia.assert(cartItem);

  const orderCreateInput = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: customerCart.subtotal_amount,
    discount_total_amount: customerCart.discount_amount,
    shipping_total_amount: customerCart.shipping_amount,
    tax_total_amount: customerCart.tax_amount,
    grand_total_amount: customerCart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateInput,
    });
  typia.assert(order);

  // 8. Switch back to platform admin to search access logs
  const adminLoginAgainInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginAgainAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginAgainInput,
    });
  typia.assert(adminLoginAgainAuthorized);

  // Build access log search filter for recent logs and HTTP methods used above
  const to = new Date();
  const from = new Date(to.getTime() - 1000 * 60 * 60); // last 1 hour

  const accessLogSearchBody = {
    from: from.toISOString(),
    to: to.toISOString(),
    httpMethods: ["POST", "PATCH", "GET"],
    actorType: undefined,
    actorId: undefined,
    actorRole: undefined,
    success: undefined,
    statusCodeMin: undefined,
    statusCodeMax: undefined,
    minLatencyMs: undefined,
    maxLatencyMs: undefined,
    ipAddress: undefined,
    pathPrefix: "/shoppingMall/",
    requestId: undefined,
    correlationId: undefined,
    page: 1 as number & tags.Type<"int32">,
    pageSize: 50 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallAccessLog.IRequest;

  const accessLogsPage: IPageIShoppingMallAccessLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.accessLogs.index(
      connection,
      {
        body: accessLogSearchBody,
      },
    );
  typia.assert(accessLogsPage);

  // Ensure we have at least one access log entry
  const logs = accessLogsPage.data;
  TestValidator.predicate(
    "access logs index must return at least one record for recent operations",
    logs.length > 0,
  );

  // Pick the first log summary to drill down
  const summary: IShoppingMallAccessLog.ISummary = logs[0];
  typia.assert(summary);

  // 9. Retrieve detailed log by id and compare with summary
  const detail: IShoppingMallAccessLog =
    await api.functional.shoppingMall.platformAdmin.accessLogs.at(connection, {
      accessLogId: summary.id,
    });
  typia.assert(detail);

  // Business-level consistency checks between summary and detail
  TestValidator.equals(
    "access log detail id must match summary id",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "access log detail actor_type must match summary actor_type",
    detail.actor_type,
    summary.actor_type,
  );
  TestValidator.equals(
    "access log detail actor_id must match summary actor_id",
    detail.actor_id,
    summary.actor_id,
  );
  TestValidator.equals(
    "access log detail http_method must match summary http_method",
    detail.http_method,
    summary.http_method,
  );
  TestValidator.equals(
    "access log detail path must match summary path",
    detail.path,
    summary.path,
  );
  TestValidator.equals(
    "access log detail status_code must match summary status_code",
    detail.status_code,
    summary.status_code,
  );
  TestValidator.equals(
    "access log detail success must match summary success",
    detail.success,
    summary.success,
  );
  TestValidator.equals(
    "access log detail latency_ms must match summary latency_ms",
    detail.latency_ms,
    summary.latency_ms,
  );
  TestValidator.equals(
    "access log detail ip must match summary ip",
    detail.ip,
    summary.ip,
  );
  TestValidator.equals(
    "access log detail user_agent must match summary user_agent",
    detail.user_agent,
    summary.user_agent,
  );
  TestValidator.equals(
    "access log detail created_at must match summary created_at",
    detail.created_at,
    summary.created_at,
  );

  // 10. Basic checks on request/response body truncation fields
  TestValidator.predicate(
    "request_body_truncated field must be present (may be undefined or string)",
    typeof detail.request_body_truncated === "string" ||
      detail.request_body_truncated === undefined,
  );
  TestValidator.predicate(
    "response_body_truncated field must be present (may be undefined or string)",
    typeof detail.response_body_truncated === "string" ||
      detail.response_body_truncated === undefined,
  );

  // Additionally, we can assert that if request_body_truncated exists, it's non-empty
  if (detail.request_body_truncated !== undefined) {
    TestValidator.predicate(
      "request_body_truncated should not be an empty string when present",
      detail.request_body_truncated.length > 0,
    );
  }
  if (detail.response_body_truncated !== undefined) {
    TestValidator.predicate(
      "response_body_truncated should not be an empty string when present",
      detail.response_body_truncated.length > 0,
    );
  }
}
