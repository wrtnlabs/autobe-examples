import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCategoryUsageStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryUsageStatistics";
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
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_category_usage_statistics_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register actors: platform admin, seller, customer
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerEmail: string = typia.random<string & tags.Format<"email">>();

  const joinPlatformAdminInput = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: "AdminPass!123",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinPlatformAdminInput,
    });
  typia.assert(platformAdminAuthorized);

  const joinSellerInput = {
    email: sellerEmail,
    password: "SellerPass!123",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinSellerInput,
    });
  typia.assert(sellerAuthorized);

  const joinCustomerInput = {
    email: customerEmail,
    password: "CustomerPass!123",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinCustomerInput,
    });
  typia.assert(customerAuthorized);

  // 2. As seller, create a seller-owned product and SKU and inventory
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass!123",
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });

  const sellerProductCode = `SELLER-${RandomGenerator.alphaNumeric(8)}`;

  const sellerProductCreate = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: sellerProductCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreate,
    });
  typia.assert(sellerProduct);

  const optionTypeCreate = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreate,
      },
    );
  typia.assert(optionType);

  const optionValueCreate = {
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
        body: optionValueCreate,
      },
    );
  typia.assert(optionValue);

  const sellerSkuCode = `SELLER-SKU-${RandomGenerator.alphaNumeric(6)}`;
  const skuListPrice = 10000;
  const skuSalePrice = 9000;

  const sellerSkuCreate = {
    code: sellerSkuCode,
    name: "Red Variant",
    listPrice: skuListPrice,
    salePrice: skuSalePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: sellerSkuCreate,
    });
  typia.assert(sellerSku);

  const inventoryCreate = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreate,
    });
  typia.assert(inventoryItem);

  // 3. As platform admin, create category tree, categories, brand, and platform product/SKU
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: "AdminPass!123",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const categoryTreeCode = `MAIN-${RandomGenerator.alphaNumeric(6)}`;

  const categoryTreeCreate = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
    description: "Tree for category usage statistics test",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreate,
      },
    );
  typia.assert(categoryTree);

  const rootCategoryCreate = {
    code: `ROOT-${RandomGenerator.alphaNumeric(4)}`,
    name: "Electronics",
    description: "Root category for electronics",
    displayOrder: 0 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: rootCategoryCreate,
      },
    );
  typia.assert(rootCategory);

  const childCategoryCreate = {
    code: `CHILD-${RandomGenerator.alphaNumeric(4)}`,
    name: "Laptops",
    description: "Child category for laptops",
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: rootCategory.code,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: childCategoryCreate,
      },
    );
  typia.assert(childCategory);

  const brandCreate = {
    name: `Brand-${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: "Test brand for category usage statistics",
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreate,
    });
  typia.assert(brand);

  const platformProductCode = `ADMIN-${RandomGenerator.alphaNumeric(8)}`;

  const platformProductCreate = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: platformProductCode,
    name: "Admin Catalog Laptop",
    short_description: "Laptop used for category usage stats test",
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const platformProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: platformProductCreate,
      },
    );
  typia.assert(platformProduct);

  const assignmentCreate = {
    shopping_mall_category_id: childCategory.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: platformProduct.code,
        body: assignmentCreate,
      },
    );
  typia.assert(assignment);

  const platformSkuCode = `ADMIN-SKU-${RandomGenerator.alphaNumeric(6)}`;

  const platformSkuCreate = {
    code: platformSkuCode,
    name: "Admin Laptop SKU",
    listPrice: skuListPrice,
    salePrice: skuSalePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const platformSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: platformProduct.code,
        body: platformSkuCreate,
      },
    );
  typia.assert(platformSku);

  // 4. As customer, create cart, add item with platform SKU, and create order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass!123",
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const cartCreate = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreate,
      },
    );
  typia.assert(cart);

  const cartItemCreate = {
    skuId: platformSku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test order for category usage statistics",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreate,
      },
    );
  typia.assert(cartItem);

  const itemsSubtotal = skuSalePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 2500;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreate = {
    customer_cart_id: cart.id,
    currency_code: "KRW",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 5. Back to platform admin, fetch category usage statistics and validate
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: "AdminPass!123",
      ip: null,
      href: "https://admin.example.com/login2",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const stats: IShoppingMallCategoryUsageStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.category_usage.index(
      connection,
    );
  typia.assert(stats);

  // Find usage entry for the child category
  const usageEntry = stats.categories.find(
    (c) => c.category_id === childCategory.id,
  );

  TestValidator.predicate(
    "usage entry for child category should exist",
    usageEntry !== undefined,
  );

  if (!usageEntry) return;

  TestValidator.predicate(
    "product_count for child category should be at least 1",
    usageEntry.product_count >= 1,
  );

  TestValidator.predicate(
    "order_line_count for child category should be at least ordered quantity",
    usageEntry.order_line_count >= cartItem.quantity,
  );

  TestValidator.predicate(
    "distinct_customer_count for child category should be at least 1",
    usageEntry.distinct_customer_count >= 1,
  );

  TestValidator.predicate(
    "total_products should be >= per-category product_count",
    stats.total_products >= usageEntry.product_count,
  );

  TestValidator.predicate(
    "total_order_lines should be >= per-category order_line_count",
    stats.total_order_lines >= usageEntry.order_line_count,
  );

  TestValidator.predicate(
    "total_distinct_customers should be >= per-category distinct_customer_count",
    stats.total_distinct_customers >= usageEntry.distinct_customer_count,
  );

  TestValidator.predicate(
    "total_products non-negative",
    stats.total_products >= 0,
  );

  TestValidator.predicate(
    "total_order_lines non-negative",
    stats.total_order_lines >= 0,
  );

  TestValidator.predicate(
    "total_distinct_customers non-negative",
    stats.total_distinct_customers >= 0,
  );
}
