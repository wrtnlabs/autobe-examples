import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that category product listing endpoint returns properly structured paginated results.
 *
 * This test validates the /ecommerceMall/categories/{categoryId}/products endpoint by:
 * 1. Calling the endpoint with a valid category ID format
 * 2. Verifying the response structure matches IPageIEcommerceMallProduct.ISummary
 * 3. Testing various query parameters (search, price filters, pagination)
 * 4. Ensuring typia.assert() validates all response fields correctly
 *
 * Note: Full hierarchy traversal testing requires category/product creation APIs
 * which are not available in the provided SDK. This test validates endpoint
 * functionality and response structure instead.
 */
export async function test_api_category_product_includes_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic category products listing with default parameters
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const basicResponse =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 20 satisfies number & tags.Type<"int32">,
        sort: "newest" as const,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(basicResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", basicResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    basicResponse.pagination.pages >= 0,
  );
  // Test 2: Category products listing with search parameter
  const searchResponse =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        search: "test",
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 10 satisfies number & tags.Type<"int32">,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(searchResponse);
  // Test 3: Category products listing with price range filter
  const priceFilterResponse =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        min_price: 0 satisfies number & tags.Minimum<0>,
        max_price: 1000 satisfies number & tags.Minimum<0>,
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 20 satisfies number & tags.Type<"int32">,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceFilterResponse);
  // Test 4: Category products listing with in_stock filter
  const stockFilterResponse =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        in_stock: true,
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 20 satisfies number & tags.Type<"int32">,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(stockFilterResponse);
  // Test 5: Category products listing with different sort options
  const priceAscResponse =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        sort: "price_asc" as const,
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 20 satisfies number & tags.Type<"int32">,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceAscResponse);
  const priceDescResponse =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        sort: "price_desc" as const,
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 20 satisfies number & tags.Type<"int32">,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceDescResponse);
  // Test 6: Verify data array structure when products exist
  if (basicResponse.data.length > 0) {
    const firstProduct = basicResponse.data[0];
    typia.assert(firstProduct);
    // Validate product summary fields
    TestValidator.predicate(
      "product has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstProduct.id,
      ),
    );
    TestValidator.predicate("product has name", firstProduct.name.length > 0);
    TestValidator.predicate(
      "product has valid base price",
      firstProduct.basePrice >= 0,
    );
    TestValidator.predicate(
      "product has valid status",
      ["active", "deleted", "suspended"].includes(firstProduct.status),
    );
    TestValidator.predicate(
      "product has seller",
      firstProduct.seller !== null && firstProduct.seller !== undefined,
    );
    TestValidator.predicate(
      "product has category",
      firstProduct.category !== null && firstProduct.category !== undefined,
    );
    TestValidator.predicate(
      "product has valid main image URL",
      firstProduct.mainImageUrl.startsWith("http"),
    );
    TestValidator.predicate(
      "product has valid average rating",
      firstProduct.averageRating >= 0 && firstProduct.averageRating <= 5,
    );
    TestValidator.predicate(
      "product has valid review count",
      firstProduct.reviewCount >= 0,
    );
    TestValidator.predicate(
      "product has valid created_at",
      firstProduct.createdAt.length > 0,
    );
    TestValidator.predicate(
      "product has valid updated_at",
      firstProduct.updatedAt.length > 0,
    );
    // Validate seller summary
    TestValidator.predicate(
      "seller has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstProduct.seller.id,
      ),
    );
    TestValidator.predicate(
      "seller has valid email",
      firstProduct.seller.email.includes("@"),
    );
    TestValidator.predicate(
      "seller has shop name",
      firstProduct.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller has valid approval status",
      ["pending", "approved", "rejected"].includes(
        firstProduct.seller.approval_status,
      ),
    );
    TestValidator.predicate(
      "seller has valid account status",
      ["active", "suspended", "banned"].includes(
        firstProduct.seller.account_status,
      ),
    );
    // Validate category summary
    TestValidator.predicate(
      "category has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstProduct.category.id,
      ),
    );
    TestValidator.predicate(
      "category has name",
      firstProduct.category.name.length > 0,
    );
    TestValidator.predicate(
      "category created_at is valid",
      firstProduct.category.created_at.length > 0,
    );
  }
}
