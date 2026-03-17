import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test customer browsing products within a category.
 * 1. Admin creates a category
 * 2. Seller creates multiple products in the category
 * 3. Customer browses products in the category
 * 4. Verify pagination and product summary fields
 */
export async function test_api_category_product_browsing_with_products(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords for login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller setup - create products
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Create multiple products in the category
  const productCount = 3;
  const products = await ArrayUtil.asyncRepeat(productCount, async (index) => {
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          name: `${RandomGenerator.name()} Product ${index + 1}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          shopping_category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
    typia.assert(product);
    return product;
  });
  // 3. Browse products in category (public endpoint - no auth required)
  const browsingConnection: api.IConnection = { host: connection.host };
  const result = await api.functional.shoppingMall.categories.products.list(
    browsingConnection,
    {
      categoryId: category.id,
    },
  );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.equals(
    "total records matches product count",
    result.pagination.records,
    productCount,
  );
  TestValidator.predicate(
    "total pages is positive",
    result.pagination.pages > 0,
  );
  // 5. Validate product list
  TestValidator.equals(
    "data array length matches product count",
    result.data.length,
    productCount,
  );
  // 6. Validate each product summary has required fields
  for (let i = 0; i < result.data.length; i++) {
    const productSummary = result.data[i];
    // Required fields validation
    TestValidator.predicate(
      "product id exists",
      productSummary.id !== undefined,
    );
    TestValidator.predicate(
      "product name exists",
      productSummary.name !== undefined,
    );
    TestValidator.predicate(
      "base price exists",
      productSummary.basePrice !== undefined,
    );
    TestValidator.predicate(
      "seller exists",
      productSummary.seller !== undefined,
    );
    TestValidator.predicate(
      "category exists",
      productSummary.category !== undefined,
    );
    TestValidator.predicate(
      "variant count exists",
      productSummary.variantCount !== undefined,
    );
    TestValidator.predicate(
      "review count exists",
      productSummary.reviewCount !== undefined,
    );
    TestValidator.predicate(
      "created at exists",
      productSummary.createdAt !== undefined,
    );
    // Validate seller information
    TestValidator.predicate(
      "seller shop name exists",
      productSummary.seller.shop_name !== undefined,
    );
    TestValidator.predicate(
      "seller email exists",
      productSummary.seller.email !== undefined,
    );
    // Validate category information
    TestValidator.predicate(
      "category id exists",
      productSummary.category.id !== undefined,
    );
    TestValidator.predicate(
      "category name exists",
      productSummary.category.name !== undefined,
    );
    // Validate category matches
    TestValidator.equals(
      "product category matches queried category",
      productSummary.category.id,
      category.id,
    );
    // Validate variant count is non-negative
    TestValidator.predicate(
      "variant count is non-negative",
      productSummary.variantCount >= 0,
    );
    // Validate review count is non-negative
    TestValidator.predicate(
      "review count is non-negative",
      productSummary.reviewCount >= 0,
    );
    // Validate base price is positive
    TestValidator.predicate(
      "base price is positive",
      productSummary.basePrice > 0,
    );
    // Validate mainImage structure if exists
    if (
      productSummary.mainImage !== null &&
      productSummary.mainImage !== undefined
    ) {
      TestValidator.predicate(
        "main image id exists",
        productSummary.mainImage.id !== undefined,
      );
      TestValidator.predicate(
        "main image url exists",
        productSummary.mainImage.imageUrl !== undefined,
      );
      TestValidator.predicate(
        "main image display order exists",
        productSummary.mainImage.displayOrder !== undefined,
      );
    }
    // Validate average rating if exists
    if (
      productSummary.averageRating !== null &&
      productSummary.averageRating !== undefined
    ) {
      TestValidator.predicate(
        "average rating is between 1 and 5",
        productSummary.averageRating! >= 1 &&
          productSummary.averageRating! <= 5,
      );
    }
  }
  // 7. Validate sorting by creation date (newest first)
  if (result.data.length >= 2) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const currentDate = new Date(result.data[i].createdAt).getTime();
      const nextDate = new Date(result.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `products sorted by createdAt desc (index ${i} vs ${i + 1})`,
        currentDate >= nextDate,
      );
    }
  }
}
