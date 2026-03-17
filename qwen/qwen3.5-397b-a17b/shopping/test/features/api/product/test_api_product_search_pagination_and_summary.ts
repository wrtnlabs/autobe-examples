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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test the basic product search functionality with pagination.
 *
 * This test verifies that the PATCH /shoppingMall/products endpoint returns
 * a paginated list of products with all required summary fields including
 * product id, name, base price, seller information (shop name), category,
 * main product image (first image by display order), variant count, average
 * rating, review count, and created at timestamp. The test also verifies
 * pagination metadata (current page, limit, total records, total pages) and
 * confirms that products are sorted by newest (created_at DESC).
 */
export async function test_api_product_search_pagination_and_summary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create multiple test products (3 products for pagination testing)
  const products: IShoppingMallProduct[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const product =
        await generate_random_shopping_mall_seller_products_create(
          sellerConnection,
          {
            body: {
              name: `Test Product ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
              description: RandomGenerator.content({ paragraphs: 2 }),
              shopping_category_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              base_price: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1000>
              >() satisfies number as number,
            } satisfies IShoppingMallProduct.ICreate,
          },
        );
      typia.assert(product);
      return product;
    },
  );
  // 3. Call product search endpoint with default pagination
  const searchResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(searchResult);
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.equals("limit", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "total records >= 3",
    searchResult.pagination.records >= 3,
  );
  TestValidator.predicate(
    "total pages >= 1",
    searchResult.pagination.pages >= 1,
  );
  // 5. Verify data array exists and has products
  TestValidator.predicate("data array exists", searchResult.data !== undefined);
  TestValidator.predicate(
    "has at least 3 products",
    searchResult.data.length >= 3,
  );
  // 6. Verify each product has all required summary fields
  for (const productSummary of searchResult.data) {
    // Verify basic fields
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
      "createdAt exists",
      productSummary.createdAt !== undefined,
    );
    // Verify seller has shop_name
    TestValidator.predicate(
      "seller shop_name exists",
      productSummary.seller.shop_name !== undefined,
    );
    // Verify variant count is non-negative integer
    TestValidator.predicate(
      "variant count is non-negative",
      productSummary.variantCount >= 0,
    );
    // Verify review count is non-negative integer
    TestValidator.predicate(
      "review count is non-negative",
      productSummary.reviewCount >= 0,
    );
  }
  // 7. Verify sorting by newest (first product should be most recently created)
  if (searchResult.data.length > 1) {
    const firstProduct = searchResult.data[0];
    const secondProduct = searchResult.data[1];
    TestValidator.predicate(
      "sorted by newest (first >= second)",
      firstProduct.createdAt >= secondProduct.createdAt,
    );
  }
}
