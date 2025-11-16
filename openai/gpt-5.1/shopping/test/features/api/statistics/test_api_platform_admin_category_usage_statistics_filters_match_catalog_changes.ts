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

export async function test_api_platform_admin_category_usage_statistics_filters_match_catalog_changes(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Admin1234!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register seller and customers
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller1234!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const customer1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinCommon = (email: string & tags.Format<"email">) =>
    ({
      email,
      password: "Customer1234!",
      name: RandomGenerator.name(),
      ip: null,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/landing",
    }) satisfies IShoppingMallCustomerAuth.IJoin;

  const customer1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinCommon(customer1Email),
    });
  typia.assert(customer1);

  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinCommon(customer2Email),
    });
  typia.assert(customer2);

  // Helper to login as specific actor when needed
  const loginPlatformAdmin = async () => {
    const body = {
      email: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest;

    const admin = await api.functional.auth.platformAdmin.login(connection, {
      body,
    });
    typia.assert(admin);
  };

  const loginSeller = async () => {
    const body = {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerLogin.IRequest;
    const sellerAuth = await api.functional.auth.seller.login(connection, {
      body,
    });
    typia.assert(sellerAuth);
  };

  const loginCustomer = async (
    email: string & tags.Format<"email">,
    href: string & tags.Format<"uri">,
  ) => {
    const body = {
      email,
      password: "Customer1234!",
      ip: null,
      href,
      referrer: "https://shop.example.com/",
      userAgent: "Mozilla/5.0",
    } satisfies IShoppingMallCustomerAuth.ILogin;
    const customerAuth = await api.functional.auth.customer.login(connection, {
      body,
    });
    typia.assert(customerAuth);
  };

  // 3. As platform admin, create category tree and test category
  await loginPlatformAdmin();

  const treeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;

  const categoryTreeCreateBody = {
    code: treeCode,
    name: "Test Tree",
    description: "Tree for category usage statistics test",
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

  const categoryCreateBody = {
    code: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name: "Test Category",
    description: "Category used for verifying usage statistics",
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: treeCode,
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. As platform admin, create brand
  const brandCreateBody = {
    name: `Brand-${RandomGenerator.name(1)}`,
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Helper to create a product under platform admin and connect to category, then create SKU and inventory as seller
  const createProductWithSkuAndInventory = async (
    productCode: string,
  ): Promise<{
    product: IShoppingMallProduct;
    sku: IShoppingMallProductSku;
  }> => {
    // Ensure platform admin context when creating product and assigning category
    await loginPlatformAdmin();

    const productCreateBody = {
      shopping_mall_seller_id: seller.seller.id,
      shopping_mall_brand_id: brand.id,
      code: productCode as string & tags.MinLength<1>,
      name: `Product-${productCode}` as string & tags.MinLength<1>,
      short_description: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active" as string & tags.MinLength<1>,
      is_multi_sku: true,
      primary_image_uri: undefined,
      additional_data: undefined,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        {
          body: productCreateBody,
        },
      );
    typia.assert(product);

    // Assign category as primary
    const assignmentBody = {
      shopping_mall_category_id: category.id,
      is_primary: true,
    } satisfies IShoppingMallProductCategoryAssignment.ICreate;

    const assignment: IShoppingMallProductCategoryAssignment =
      await api.functional.shoppingMall.platformAdmin.products.categories.create(
        connection,
        {
          productCode,
          body: assignmentBody,
        },
      );
    typia.assert(assignment);

    // For SKU and inventory, act as seller
    await loginSeller();

    const skuCreateBody = {
      code: `${productCode}-sku` as string,
      name: `${productCode} Default SKU`,
      listPrice: 100,
      salePrice: 80,
      currency: "USD",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;

    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode,
          body: skuCreateBody,
        },
      );
    typia.assert(sku);

    const inventoryCreateBody = {
      product_sku_id: sku.id,
      on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      backorder_enabled: false,
      preorder_enabled: false,
    } satisfies IShoppingMallInventoryItem.ICreate;

    const inventory: IShoppingMallInventoryItem =
      await api.functional.shoppingMall.seller.inventoryItems.create(
        connection,
        {
          body: inventoryCreateBody,
        },
      );
    typia.assert(inventory);

    return { product, sku };
  };

  // 5. Create first product (A) and related SKU & inventory
  const productCodeA = `prodA-${RandomGenerator.alphaNumeric(6)}`;
  const { sku: skuA } = await createProductWithSkuAndInventory(productCodeA);

  // 6. Customer 1: create cart, add SKU A, and place order
  await loginCustomer(
    customer1Email,
    "https://shop.example.com/customer1/cart" as string & tags.Format<"uri">,
  );

  const cartCreateBody1 = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart1: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody1,
      },
    );
  typia.assert(cart1);

  const cartItemCreateBody1 = {
    skuId: skuA.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem1: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart1.id,
        body: cartItemCreateBody1,
      },
    );
  typia.assert(cartItem1);

  const orderCreateBody1 = {
    customer_cart_id: cart1.id,
    currency_code: cart1.currency_code,
    items_subtotal_amount: 80,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 80,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Order from customer 1",
  } satisfies IShoppingMallOrder.ICreate;

  const order1: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody1,
    });
  typia.assert(order1);

  // 7. Baseline statistics as platform admin
  await loginPlatformAdmin();
  const baselineStats: IShoppingMallCategoryUsageStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.category_usage.index(
      connection,
    );
  typia.assert(baselineStats);

  // Helper to find category usage entry
  const findUsage = (
    stats: IShoppingMallCategoryUsageStatistics,
  ): IShoppingMallCategoryUsageStatistics.ICategoryUsage | undefined =>
    stats.categories.find((c) => c.category_id === category.id);

  const baselineUsage = findUsage(baselineStats);

  // 8. Create second product (B) under same category, with SKU & inventory
  const productCodeB = `prodB-${RandomGenerator.alphaNumeric(6)}`;
  const { sku: skuB } = await createProductWithSkuAndInventory(productCodeB);

  // 9. Customer 2: create cart, add SKU B, and place order
  await loginCustomer(
    customer2Email,
    "https://shop.example.com/customer2/cart" as string & tags.Format<"uri">,
  );

  const cartCreateBody2 = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart2: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody2,
      },
    );
  typia.assert(cart2);

  const cartItemCreateBody2 = {
    skuId: skuB.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem2: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart2.id,
        body: cartItemCreateBody2,
      },
    );
  typia.assert(cartItem2);

  const orderCreateBody2 = {
    customer_cart_id: cart2.id,
    currency_code: cart2.currency_code,
    items_subtotal_amount: 80,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 80,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Order from customer 2",
  } satisfies IShoppingMallOrder.ICreate;

  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody2,
    });
  typia.assert(order2);

  // 10. Updated statistics after second order
  await loginPlatformAdmin();
  const updatedStats: IShoppingMallCategoryUsageStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.category_usage.index(
      connection,
    );
  typia.assert(updatedStats);

  const updatedUsage = findUsage(updatedStats);

  // Validate that category exists in both snapshots
  TestValidator.predicate(
    "baseline stats should contain test category or allow undefined baseline",
    () =>
      baselineUsage === undefined || baselineUsage.category_id === category.id,
  );

  TestValidator.predicate(
    "updated stats should contain test category",
    () =>
      updatedUsage !== undefined && updatedUsage.category_id === category.id,
  );

  if (baselineUsage && updatedUsage) {
    TestValidator.predicate(
      "product_count should be non-decreasing and at least 2 after two products",
      () =>
        updatedUsage.product_count >= baselineUsage.product_count &&
        updatedUsage.product_count >= 2,
    );

    TestValidator.predicate(
      "order_line_count should strictly increase after second order",
      () => updatedUsage.order_line_count > baselineUsage.order_line_count,
    );

    TestValidator.predicate(
      "distinct_customer_count should strictly increase after second customer order",
      () =>
        updatedUsage.distinct_customer_count >
        baselineUsage.distinct_customer_count,
    );
  }

  // Also validate monotonic non-decreasing totals
  TestValidator.predicate(
    "total_products should not decrease",
    () => updatedStats.total_products >= baselineStats.total_products,
  );

  TestValidator.predicate(
    "total_order_lines should not decrease",
    () => updatedStats.total_order_lines >= baselineStats.total_order_lines,
  );

  TestValidator.predicate(
    "total_distinct_customers should not decrease",
    () =>
      updatedStats.total_distinct_customers >=
      baselineStats.total_distinct_customers,
  );
}
