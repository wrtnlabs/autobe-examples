import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator retrieval of paginated product list for an approved seller.
 *
 * Validates the complete workflow where an administrator queries products owned by a specific seller. The test establishes the necessary prerequisites including admin authentication, seller registration and approval, and product creation with images and variants.
 *
 * The test verifies that the admin endpoint correctly returns product summaries with all required fields including pagination metadata, product details, category information, seller references, thumbnail URLs from product images, and stock availability status computed from variants.
 *
 * 1. Administrator creates account and authenticates.
 * 2. Seller registers account with credentials.
 * 3. Admin approves seller registration to enable product creation.
 * 4. Seller creates multiple products with names, descriptions, categories, and base prices.
 * 5. Seller uploads product images for each product with display order.
 * 6. Seller creates product variants for stock status computation.
 * 7. Admin queries products for the approved seller via PATCH endpoint.
 * 8. Validates response structure, pagination metadata, and product data integrity.
 */
export async function test_api_admin_seller_product_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup - register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves seller registration
  const approvedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {
        approval_status: "approved",
        rejection_reason: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approval_status,
    "approved",
  );
  // 4. Seller creates multiple products
  const productCount = 3;
  const products: IShoppingMallProduct[] = [];
  for (let i = 0; i < productCount; i++) {
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Test Product ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
    typia.assert(product);
    products.push(product);
  }
  // 5. Seller adds product images for each product
  for (const product of products) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            url: `https://example.com/images/${product.id}.jpg`,
            display_order: 0,
          },
        },
      );
    typia.assert(image);
  }
  // 6. Seller creates product variants for stock computation
  for (const product of products) {
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}`,
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          },
        },
      );
    typia.assert(variant);
  }
  // 7. Admin queries products for the approved seller
  const result = await api.functional.shoppingMall.admin.sellers.products.index(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(result);
  // 8. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.equals(
    "total records",
    result.pagination.records,
    productCount,
  );
  TestValidator.predicate(
    "total pages calculated",
    result.pagination.pages >= 1,
  );
  TestValidator.equals("products returned", result.data.length, productCount);
  // Validate each product in the response
  for (const productSummary of result.data) {
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
      productSummary.base_price !== undefined,
    );
    TestValidator.predicate(
      "category exists",
      productSummary.category !== undefined,
    );
    TestValidator.predicate(
      "seller exists",
      productSummary.seller !== undefined,
    );
    TestValidator.predicate(
      "createdAt exists",
      productSummary.createdAt !== undefined,
    );
    // Verify seller information matches the queried seller
    TestValidator.equals(
      "seller id matches",
      productSummary.seller.id,
      sellerAuth.id,
    );
    TestValidator.equals(
      "seller email matches",
      productSummary.seller.email,
      sellerAuth.email,
    );
    // Verify category has required fields
    TestValidator.predicate(
      "category id exists",
      productSummary.category.id !== undefined,
    );
    TestValidator.predicate(
      "category name exists",
      productSummary.category.name !== undefined,
    );
    // Verify thumbnailUrl is present (from product image we added)
    TestValidator.predicate(
      "thumbnailUrl exists",
      productSummary.thumbnailUrl !== undefined &&
        productSummary.thumbnailUrl !== null,
    );
    // Verify product is in stock (we created variants)
    TestValidator.predicate(
      "product is in stock",
      productSummary.inStock === true,
    );
  }
  // Verify products are sorted by newest (created_at DESC)
  for (let i = 1; i < result.data.length; i++) {
    const prevDate = new Date(result.data[i - 1].createdAt).getTime();
    const currDate = new Date(result.data[i].createdAt).getTime();
    TestValidator.predicate("products sorted by newest", prevDate >= currDate);
  }
}
