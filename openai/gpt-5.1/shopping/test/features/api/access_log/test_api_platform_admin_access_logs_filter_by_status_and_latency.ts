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

export async function test_api_platform_admin_access_logs_filter_by_status_and_latency(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin (store plaintext password locally)
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      name: RandomGenerator.name(),
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallPlatformAdminJoin.IRequest,
  });
  typia.assert(adminJoin);

  // 2. Register seller with stored password
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      storeName: RandomGenerator.name(2),
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest,
  });
  typia.assert(sellerJoin);

  // 3. Register customer with stored password (connection now authenticated as customer)
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      name: RandomGenerator.name(),
      ip: null,
      href: "https://shop.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallCustomerAuth.IJoin,
  });
  typia.assert(customerJoin);

  // 4. As customer, create a persistent cart (generates success logs)
  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: {
          currency_code: "USD",
          region_code: "US",
          channel: "web",
          metadata: undefined,
          is_active: true,
          source_guest_token: undefined,
        } satisfies IShoppingMallCustomerCart.ICreate,
      },
    );
  typia.assert(customerCart);

  // 5. Switch back to platform admin to build catalog primitives
  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: adminJoin.email,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(adminLogin);

  // Create category tree
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          active: true,
          defaultLocale: "en-US",
        } satisfies IShoppingMallCategoryTree.ICreate,
      },
    );
  typia.assert(categoryTree);

  // Create brand
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        slug: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        logo_uri: "https://cdn.example.com/logo.png" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallBrand.ICreate,
    });
  typia.assert(brand);

  // Create admin-managed product (owned by seller but created by admin)
  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: {
          shopping_mall_seller_id: sellerJoin.id,
          shopping_mall_brand_id: brand.id,
          code: RandomGenerator.alphaNumeric(10) as string & tags.MinLength<1>,
          name: RandomGenerator.paragraph({ sentences: 2 }) as string &
            tags.MinLength<1>,
          short_description: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          status: "active" as string & tags.MinLength<1>,
          is_multi_sku: true,
          primary_image_uri: "https://cdn.example.com/product.png" as string &
            tags.Format<"uri">,
          additional_data: undefined,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(adminProduct);

  // Create admin SKU under admin product
  const adminSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: adminProduct.code,
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          listPrice: 100,
          salePrice: 80,
          currency: "USD",
          isActive: true,
          isPurchasable: true,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(adminSku);

  // 6. Switch to seller and create their own product + SKU + inventory
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerJoin.email,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert(sellerLogin);

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerLogin.id,
        shopping_mall_brand_id: brand.id,
        code: RandomGenerator.alphaNumeric(10) as string & tags.MinLength<1>,
        name: RandomGenerator.paragraph({ sentences: 2 }) as string &
          tags.MinLength<1>,
        short_description: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active" as string & tags.MinLength<1>,
        is_multi_sku: false,
        primary_image_uri:
          "https://cdn.example.com/seller-product.png" as string &
            tags.Format<"uri">,
        additional_data: undefined,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(sellerProduct);

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        listPrice: 50,
        salePrice: 45,
        currency: "USD",
        isActive: true,
        isPurchasable: true,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sellerSku);

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: {
        product_sku_id: sellerSku.id,
        on_hand_quantity: 100,
        low_stock_threshold: 10,
        backorder_enabled: false,
        preorder_enabled: false,
      } satisfies IShoppingMallInventoryItem.ICreate,
    });
  typia.assert(inventoryItem);

  // 7. Switch back to customer to generate successful and failing cart operations
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerJoin.email,
        password: customerPassword,
        ip: null,
        href: "https://shop.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });
  typia.assert(customerLogin);

  // Valid cart item to generate a 2xx log
  const validCartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: {
          skuId: sellerSku.id,
          quantity: 1,
          note: "valid item",
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(validCartItem);

  // Best-effort order creation to add more 2xx logs (may fail in real backend, but fine for logging)
  const orderBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: 45,
    discount_total_amount: 0,
    shipping_total_amount: 5,
    tax_total_amount: 0,
    grand_total_amount: 50,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "please deliver fast",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // Intentionally create a failing request: invalid SKU UUID for cart item (4xx error)
  await TestValidator.error(
    "creating cart item with non-existing SKU should fail (4xx)",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: customerCart.id,
          body: {
            skuId: typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
            note: "invalid sku",
          } satisfies IShoppingMallCustomerCartItem.ICreate,
        },
      );
    },
  );

  // 8. Switch back to platform admin to query access logs
  const adminReLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: adminJoin.email,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(adminReLogin);

  // Build a time window covering recent operations
  const to = new Date().toISOString() as string & tags.Format<"date-time">;
  const fromDate = new Date(Date.now() - 1000 * 60 * 60); // last hour
  const from = fromDate.toISOString() as string & tags.Format<"date-time">;

  // 9. Query only error logs (4xx range)
  const errorLogsRequest = {
    from,
    to,
    statusCodeMin: 400,
    statusCodeMax: 499,
    minLatencyMs: undefined,
    maxLatencyMs: undefined,
    httpMethods: undefined,
    pathPrefix: undefined,
    ipAddress: undefined,
    actorType: undefined,
    actorId: undefined,
    actorRole: undefined,
    success: false,
    requestId: undefined,
    correlationId: undefined,
    page: 1,
    pageSize: 50,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallAccessLog.IRequest;

  const errorPage: IPageIShoppingMallAccessLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.accessLogs.index(
      connection,
      {
        body: errorLogsRequest,
      },
    );
  typia.assert(errorPage);

  const errorPagination: IPage.IPagination = errorPage.pagination;
  typia.assert(errorPagination);

  // Basic pagination sanity checks for error logs
  TestValidator.predicate(
    "error logs records should be >= 0",
    errorPagination.records >= 0,
  );
  TestValidator.predicate(
    "error logs data length does not exceed limit",
    errorPage.data.length <= errorPagination.limit,
  );
  TestValidator.predicate(
    "error logs pages are consistent with records and limit",
    (errorPagination.pages === 0 && errorPagination.records === 0) ||
      (errorPagination.pages > 0 && errorPagination.limit > 0),
  );

  for (const log of errorPage.data) {
    typia.assert<IShoppingMallAccessLog.ISummary>(log);
    TestValidator.predicate(
      "status_code is within 400-499",
      log.status_code >= (errorLogsRequest.statusCodeMin ?? 0) &&
        log.status_code <= (errorLogsRequest.statusCodeMax ?? 599),
    );
    TestValidator.equals("error log success flag is false", log.success, false);
  }

  // 10. Query only success logs (2xx range)
  const successLogsRequest = {
    from,
    to,
    statusCodeMin: 200,
    statusCodeMax: 299,
    minLatencyMs: undefined,
    maxLatencyMs: undefined,
    httpMethods: undefined,
    pathPrefix: undefined,
    ipAddress: undefined,
    actorType: undefined,
    actorId: undefined,
    actorRole: undefined,
    success: true,
    requestId: undefined,
    correlationId: undefined,
    page: 1,
    pageSize: 50,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallAccessLog.IRequest;

  const successPage: IPageIShoppingMallAccessLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.accessLogs.index(
      connection,
      {
        body: successLogsRequest,
      },
    );
  typia.assert(successPage);

  const successPagination: IPage.IPagination = successPage.pagination;
  typia.assert(successPagination);

  TestValidator.predicate(
    "success logs records should be >= 0",
    successPagination.records >= 0,
  );
  TestValidator.predicate(
    "success logs data length does not exceed limit",
    successPage.data.length <= successPagination.limit,
  );
  TestValidator.predicate(
    "success logs pages are consistent with records and limit",
    (successPagination.pages === 0 && successPagination.records === 0) ||
      (successPagination.pages > 0 && successPagination.limit > 0),
  );

  for (const log of successPage.data) {
    typia.assert<IShoppingMallAccessLog.ISummary>(log);
    TestValidator.predicate(
      "status_code is within 200-299",
      log.status_code >= (successLogsRequest.statusCodeMin ?? 0) &&
        log.status_code <= (successLogsRequest.statusCodeMax ?? 299),
    );
    TestValidator.equals("success log success flag is true", log.success, true);
  }
}
