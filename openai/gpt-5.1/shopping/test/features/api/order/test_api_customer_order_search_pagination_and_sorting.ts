import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
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

export async function test_api_customer_order_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // create category tree
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // create brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2. Seller joins, logs in, creates product, option type, option value, sku, inventory
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      { productCode, body: optionTypeCreateBody },
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

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: "Red Variant",
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  // 3. Customer joins, logs in, creates cart, adds item, and creates multiple orders
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(cart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      { customerCartId: cart.id, body: cartItemCreateBody },
    );
  typia.assert(cartItem);

  const orders: IShoppingMallOrder[] = [];
  const orderCount = 15;
  for (let i = 0; i < orderCount; i++) {
    const baseAmount = 90;
    const itemsSubtotal = baseAmount;
    const discountTotal = 0;
    const shippingTotal = 10;
    const taxTotal = 0;
    const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

    const orderCreateBody = {
      customer_cart_id: cart.id,
      currency_code: "USD",
      items_subtotal_amount: itemsSubtotal,
      discount_total_amount: discountTotal,
      shipping_total_amount: shippingTotal,
      tax_total_amount: taxTotal,
      grand_total_amount: grandTotal,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: `order-${i}`,
    } satisfies IShoppingMallOrder.ICreate;
    const createdOrder: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(createdOrder);
    orders.push(createdOrder);
  }

  // sort local copy for later comparison by placed_at descending / ascending
  const ordersByPlacedDesc = [...orders].sort((a, b) =>
    a.placed_at < b.placed_at ? 1 : a.placed_at > b.placed_at ? -1 : 0,
  );
  const ordersByPlacedAsc = [...ordersByPlacedDesc].slice().reverse();

  // 4. Search with pagination and sorting by placed_at
  const limit = 5;

  const searchPage1Desc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: {
        page: 1,
        limit,
        sortBy: "placed_at",
        sortDirection: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(searchPage1Desc);

  const searchPage2Desc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: {
        page: 2,
        limit,
        sortBy: "placed_at",
        sortDirection: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(searchPage2Desc);

  const searchPage1Asc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: {
        page: 1,
        limit,
        sortBy: "placed_at",
        sortDirection: "asc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(searchPage1Asc);

  // 5. Assertions
  const pagination1 = searchPage1Desc.pagination;
  TestValidator.equals(
    "pagination.records equals created order count",
    pagination1.records,
    orderCount,
  );

  const expectedPages = Math.ceil(orderCount / pagination1.limit);
  TestValidator.equals(
    "pagination.pages consistent with records and limit",
    pagination1.pages,
    expectedPages,
  );

  TestValidator.equals(
    "pagination.limit matches requested limit",
    pagination1.limit,
    limit,
  );

  // union of first two pages desc has distinct orders, matching top slice by placed_at
  const unionDesc = [...searchPage1Desc.data, ...searchPage2Desc.data];
  const unionIds = unionDesc.map((s) => s.id);
  const distinctUnionIds = Array.from(new Set(unionIds));
  TestValidator.equals(
    "union of first two pages has distinct orders",
    distinctUnionIds.length,
    Math.min(orderCount, limit * 2),
  );

  const expectedTopIds = ordersByPlacedDesc
    .slice(0, Math.min(orderCount, limit * 2))
    .map((o) => o.id);
  TestValidator.equals(
    "union of pages covers same top orders as local sort by placed_at desc",
    distinctUnionIds,
    expectedTopIds,
  );

  // verify sorting direction for desc page1 (placed_at)
  for (let i = 1; i < searchPage1Desc.data.length; i++) {
    const prev = searchPage1Desc.data[i - 1];
    const curr = searchPage1Desc.data[i];
    TestValidator.predicate(
      "placed_at descending within page1",
      prev.placed_at >= curr.placed_at,
    );
  }

  // verify sorting direction for asc page1 (placed_at)
  for (let i = 1; i < searchPage1Asc.data.length; i++) {
    const prev = searchPage1Asc.data[i - 1];
    const curr = searchPage1Asc.data[i];
    TestValidator.predicate(
      "placed_at ascending within page1",
      prev.placed_at <= curr.placed_at,
    );
  }

  // ensure all returned orders belong to the authenticated customer (when customer info is present)
  for (const page of [searchPage1Desc, searchPage2Desc, searchPage1Asc]) {
    for (const summary of page.data) {
      if (summary.customer !== undefined) {
        TestValidator.equals(
          "order summary customer id must match authorized customer",
          summary.customer.id,
          customerAuthorized.customer.id,
        );
      }
    }
  }
}
