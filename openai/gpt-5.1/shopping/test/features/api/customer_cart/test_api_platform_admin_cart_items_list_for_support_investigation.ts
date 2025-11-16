import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_cart_items_list_for_support_investigation(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain an authorized session
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 2. As this customer, create a persistent cart
  const customerCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartBody,
      },
    );
  typia.assert(customerCart);

  // 3. Register a platform admin and obtain admin session
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 4. Create catalog prerequisites as platform admin: category tree, brand, product, SKU
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: "Category tree for e2e testing support investigation",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: "Brand for admin cart item listing test",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = `P-${RandomGenerator.alphaNumeric(10)}`;

  // In this e2e context, use a random seller UUID as the owning seller
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Investigation Product",
    short_description: "Product for support investigation cart listing",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;

  const skuBody = {
    code: skuCode,
    name: "Investigation SKU",
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
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 5. Switch back to customer and add several items to the cart
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/home",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuth);

  const createdItems: IShoppingMallCustomerCartItem[] = [];

  const quantities = [1, 2, 3] as const;
  for (const qty of quantities) {
    const cartItemBody = {
      skuId: sku.id,
      quantity: qty,
      note: `Line item with quantity ${qty}`,
    } satisfies IShoppingMallCustomerCartItem.ICreate;

    const cartItem: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: customerCart.id,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);
    createdItems.push(cartItem);
  }

  TestValidator.equals(
    "created 3 cart items for investigation",
    createdItems.length,
    3,
  );

  // 6. Switch to platform admin session again
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuth);

  // 7. Admin lists items of the specific customer cart without filters
  const listRequestAll = {
    page: 0,
    limit: 10,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallCustomerCartItem.IRequest;

  const adminListAll: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.items.index(
      connection,
      {
        customerCartId: customerCart.id,
        body: listRequestAll,
      },
    );
  typia.assert(adminListAll);

  const paginationAll: IPage.IPagination = adminListAll.pagination;
  typia.assert(paginationAll);

  TestValidator.predicate(
    "admin listing current page is 0",
    paginationAll.current === 0,
  );

  TestValidator.predicate(
    "admin listing has non-negative records count",
    paginationAll.records >= 0,
  );

  TestValidator.predicate(
    "admin listing has at least as many items as we created (within page limit)",
    adminListAll.data.length >= createdItems.length ||
      paginationAll.limit < createdItems.length,
  );

  TestValidator.predicate(
    "admin listing has at least one item",
    adminListAll.data.length > 0,
  );

  const summarizedIds = adminListAll.data.map((s) => s.id);
  for (const created of createdItems) {
    TestValidator.predicate(
      "each created item appears in admin listing (within first page)",
      summarizedIds.includes(created.id) ||
        paginationAll.limit < createdItems.length,
    );
  }

  for (const summary of adminListAll.data) {
    typia.assert(summary);

    TestValidator.predicate(
      "summary quantity is positive",
      summary.quantity >= 1,
    );

    TestValidator.predicate(
      "maxPurchasableQuantity not less than quantity",
      summary.maxPurchasableQuantity >= summary.quantity,
    );

    TestValidator.predicate(
      "unitPrice and totalPrice non-negative",
      summary.unitPrice >= 0 && summary.totalPrice >= 0,
    );

    TestValidator.predicate(
      "cartId in summary matches requested cart",
      summary.cartId === customerCart.id,
    );

    TestValidator.predicate(
      "summary SKU code matches created sku",
      summary.sku.code === sku.code,
    );
  }

  // 8. Admin listing filtered by SKU code
  const listRequestBySku = {
    page: 0,
    limit: 10,
    sku_code: sku.code,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallCustomerCartItem.IRequest;

  const adminListBySku: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.items.index(
      connection,
      {
        customerCartId: customerCart.id,
        body: listRequestBySku,
      },
    );
  typia.assert(adminListBySku);

  TestValidator.predicate(
    "filtered by sku_code returns at least one item",
    adminListBySku.data.length > 0,
  );

  for (const summary of adminListBySku.data) {
    typia.assert(summary);
    TestValidator.equals(
      "sku_code filter respected",
      summary.sku.code,
      sku.code,
    );

    TestValidator.predicate(
      "filtered summary cartId matches requested cart",
      summary.cartId === customerCart.id,
    );
  }
}
