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

export async function test_api_platform_admin_category_usage_statistics_multiple_categories_and_products(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword!123",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword!123",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Seller joins and logs in
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword!123",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassword!123",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Create category tree and categories A, B, C as platform admin
  const categoryTreeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;

  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Test Category Tree",
    description: "Category tree for category-usage statistics E2E test",
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

  const categoryABody = {
    code: "cat-a",
    name: "Category A",
    description: "Category A for statistics test",
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryBBody = {
    code: "cat-b",
    name: "Category B",
    description: "Category B for statistics test",
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryCBody = {
    code: "cat-c",
    name: "Category C",
    description: "Category C for statistics test",
    displayOrder: 3 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode,
        body: categoryABody,
      },
    );
  typia.assert(categoryA);

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode,
        body: categoryBBody,
      },
    );
  typia.assert(categoryB);

  const categoryC: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode,
        body: categoryCBody,
      },
    );
  typia.assert(categoryC);

  // 4. Create brand as platform admin
  const brandBody = {
    name: "Test Brand",
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: "Brand for statistics test",
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Create products A, B, C under platformAdmin with the seller as owner
  const baseProductCreate = (
    code: string,
    name: string,
  ): IShoppingMallProduct.ICreate => ({
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code,
    name,
    short_description: `Short description for ${name}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  });

  const productCodeA = `prod-a-${RandomGenerator.alphaNumeric(6)}`;
  const productCodeB = `prod-b-${RandomGenerator.alphaNumeric(6)}`;
  const productCodeC = `prod-c-${RandomGenerator.alphaNumeric(6)}`;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: baseProductCreate(productCodeA, "Product A"),
      },
    );
  typia.assert(productA);

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: baseProductCreate(productCodeB, "Product B"),
      },
    );
  typia.assert(productB);

  const productC: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: baseProductCreate(productCodeC, "Product C"),
      },
    );
  typia.assert(productC);

  // 6. Assign products to categories A, B, C
  const assignProductToCategory = async (
    productCode: string,
    categoryId: string & tags.Format<"uuid">,
    isPrimary: boolean,
  ): Promise<IShoppingMallProductCategoryAssignment> => {
    const body = {
      shopping_mall_category_id: categoryId,
      is_primary: isPrimary,
    } satisfies IShoppingMallProductCategoryAssignment.ICreate;

    const assignment: IShoppingMallProductCategoryAssignment =
      await api.functional.shoppingMall.platformAdmin.products.categories.create(
        connection,
        {
          productCode,
          body,
        },
      );
    typia.assert(assignment);
    return assignment;
  };

  await assignProductToCategory(productCodeA, categoryA.id, true);
  await assignProductToCategory(productCodeB, categoryB.id, true);
  await assignProductToCategory(productCodeC, categoryC.id, true);

  // 7. Create SKUs for products A, B, C via platformAdmin
  const skuPrice = 100;

  const createSkuForProduct = async (
    productCode: string,
    suffix: string,
  ): Promise<IShoppingMallProductSku> => {
    const body = {
      code: `${productCode}-sku-${suffix}`,
      name: `SKU ${suffix} for ${productCode}`,
      listPrice: skuPrice,
      salePrice: skuPrice,
      currency: "USD",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;

    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.platformAdmin.products.skus.create(
        connection,
        {
          productCode,
          body,
        },
      );
    typia.assert(sku);
    return sku;
  };

  const skuA: IShoppingMallProductSku = await createSkuForProduct(
    productCodeA,
    "a",
  );
  const skuB: IShoppingMallProductSku = await createSkuForProduct(
    productCodeB,
    "b",
  );
  const skuC: IShoppingMallProductSku = await createSkuForProduct(
    productCodeC,
    "c",
  );

  // 8. Create inventory items for SkuA and SkuB (but not SkuC) as seller
  const inventoryBodyForSku = (
    skuId: string & tags.Format<"uuid">,
  ): IShoppingMallInventoryItem.ICreate => ({
    product_sku_id: skuId,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined,
    backorder_enabled: false,
    preorder_enabled: false,
  });

  const inventoryA: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBodyForSku(skuA.id),
    });
  typia.assert(inventoryA);

  const inventoryB: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBodyForSku(skuB.id),
    });
  typia.assert(inventoryB);

  // Intentionally no inventory for skuC to keep it with no activity.

  // 9. Create two customers and their carts and cart items (A/B & B)
  const createCustomerWithCartAndItems = async (
    joinEmail: string,
    skuIds: (string & tags.Format<"uuid">)[],
  ) => {
    const joinBody = {
      email: joinEmail,
      password: "CustomerPassword!123",
      name: RandomGenerator.name(),
      ip: null,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const customerAuthorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert(customerAuthorized);

    const cartBody = {
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
        {
          body: cartBody,
        },
      );
    typia.assert(cart);

    // Add one cart item per SKU to this customer's cart
    await ArrayUtil.asyncForEach(skuIds, async (skuId) => {
      const cartItemBody = {
        skuId,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        note: null,
      } satisfies IShoppingMallCustomerCartItem.ICreate;

      const item: IShoppingMallCustomerCartItem =
        await api.functional.shoppingMall.customer.customerCarts.items.create(
          connection,
          {
            customerCartId: cart.id,
            body: cartItemBody,
          },
        );
      typia.assert(item);
    });
  };

  const customer1Email: string = typia.random<string & tags.Format<"email">>();
  const customer2Email: string = typia.random<string & tags.Format<"email">>();

  // Customer 1: items for SKU A and SKU B
  await createCustomerWithCartAndItems(customer1Email, [skuA.id, skuB.id]);

  // Customer 2: only SKU B
  await createCustomerWithCartAndItems(customer2Email, [skuB.id]);

  // 10. Fetch category usage statistics as platform admin and validate
  const stats: IShoppingMallCategoryUsageStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.category_usage.index(
      connection,
    );
  typia.assert(stats);

  // Basic non-negative totals
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

  // Find our three categories by name
  const findCategoryByName = (
    name: string,
  ): IShoppingMallCategoryUsageStatistics.ICategoryUsage | undefined =>
    stats.categories.find((c) => c.category_name === name);

  const usageA = findCategoryByName("Category A");
  const usageB = findCategoryByName("Category B");
  const usageC = findCategoryByName("Category C");

  TestValidator.predicate(
    "Category A exists in usage stats",
    usageA !== undefined,
  );
  TestValidator.predicate(
    "Category B exists in usage stats",
    usageB !== undefined,
  );
  TestValidator.predicate(
    "Category C exists in usage stats",
    usageC !== undefined,
  );

  if (usageA) {
    TestValidator.predicate(
      "Category A product_count >= 1",
      usageA.product_count >= 1,
    );
    TestValidator.predicate(
      "Category A order_line_count >= 0",
      usageA.order_line_count >= 0,
    );
    TestValidator.predicate(
      "Category A distinct_customer_count >= 0",
      usageA.distinct_customer_count >= 0,
    );
    TestValidator.predicate(
      "Category A product_share_ratio >= 0",
      usageA.product_share_ratio >= 0,
    );
    TestValidator.predicate(
      "Category A order_line_share_ratio >= 0",
      usageA.order_line_share_ratio >= 0,
    );
  }

  if (usageB) {
    TestValidator.predicate(
      "Category B product_count >= 1",
      usageB.product_count >= 1,
    );
    TestValidator.predicate(
      "Category B order_line_count >= 0",
      usageB.order_line_count >= 0,
    );
    TestValidator.predicate(
      "Category B distinct_customer_count >= 0",
      usageB.distinct_customer_count >= 0,
    );
    TestValidator.predicate(
      "Category B product_share_ratio >= 0",
      usageB.product_share_ratio >= 0,
    );
    TestValidator.predicate(
      "Category B order_line_share_ratio >= 0",
      usageB.order_line_share_ratio >= 0,
    );
  }

  if (usageC) {
    TestValidator.predicate(
      "Category C product_count >= 1",
      usageC.product_count >= 1,
    );
    TestValidator.predicate(
      "Category C order_line_count >= 0",
      usageC.order_line_count >= 0,
    );
    TestValidator.predicate(
      "Category C distinct_customer_count >= 0",
      usageC.distinct_customer_count >= 0,
    );
    TestValidator.predicate(
      "Category C product_share_ratio >= 0",
      usageC.product_share_ratio >= 0,
    );
    TestValidator.predicate(
      "Category C order_line_share_ratio >= 0",
      usageC.order_line_share_ratio >= 0,
    );
  }

  // Totals should be at least the maxima of per-category metrics
  const maxProductCount = stats.categories.reduce(
    (max, c) => (c.product_count > max ? c.product_count : max),
    0 as number & tags.Type<"int32">,
  );
  const maxOrderLines = stats.categories.reduce(
    (max, c) => (c.order_line_count > max ? c.order_line_count : max),
    0 as number & tags.Type<"int32">,
  );
  const maxDistinctCustomers = stats.categories.reduce(
    (max, c) =>
      c.distinct_customer_count > max ? c.distinct_customer_count : max,
    0 as number & tags.Type<"int32">,
  );

  TestValidator.predicate(
    "total_products >= max category product_count",
    stats.total_products >= maxProductCount,
  );
  TestValidator.predicate(
    "total_order_lines >= max category order_line_count",
    stats.total_order_lines >= maxOrderLines,
  );
  TestValidator.predicate(
    "total_distinct_customers >= max category distinct_customer_count",
    stats.total_distinct_customers >= maxDistinctCustomers,
  );
}
