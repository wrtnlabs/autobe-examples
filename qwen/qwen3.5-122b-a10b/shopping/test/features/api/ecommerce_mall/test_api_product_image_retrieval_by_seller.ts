import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product image retrieval by seller endpoint.
 *
 * Validates the PATCH /ecommerceMall/products/{productId}/images endpoint:
 * 1. Retrieves paginated list of product images for a specific product
 * 2. Validates pagination metadata (current, limit, records, pages)
 * 3. Validates image summary fields (id, url, sort_order, is_primary, created_at)
 * 4. Verifies images are sorted by sort_order ascending
 * 5. Tests pagination with different parameters
 */
export async function test_api_product_image_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate test product ID
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Default pagination - retrieve all images
  const defaultResponse: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(sellerConnection, {
      productId,
      body: {},
    });
  typia.assert(defaultResponse);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is number",
    typeof defaultResponse.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof defaultResponse.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof defaultResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof defaultResponse.pagination.pages === "number",
  );
  // Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultResponse.data),
  );
  // Test 2: Validate image summary fields when data exists
  if (defaultResponse.data.length > 0) {
    const firstImage = defaultResponse.data[0];
    // Validate required fields exist with correct types
    TestValidator.predicate(
      "image id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstImage.id,
      ),
    );
    TestValidator.predicate(
      "image url is string",
      typeof firstImage.url === "string",
    );
    TestValidator.predicate(
      "image sort_order is number",
      typeof firstImage.sort_order === "number",
    );
    TestValidator.predicate(
      "image is_primary is boolean",
      typeof firstImage.is_primary === "boolean",
    );
    TestValidator.predicate(
      "image created_at is date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstImage.created_at,
      ),
    );
  }
  // Test 3: Verify sort order ascending
  if (defaultResponse.data.length > 1) {
    const isSorted = defaultResponse.data.every(
      (img, index) =>
        index === 0 ||
        img.sort_order >= defaultResponse.data[index - 1].sort_order,
    );
    TestValidator.predicate("images sorted by sort_order ascending", isSorted);
  }
  // Test 4: Test pagination with custom parameters
  const page2Response: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(sellerConnection, {
      productId,
      body: {
        page: 2,
        limit: 10,
      },
    });
  typia.assert(page2Response);
  // Validate page 2 response
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 10",
    page2Response.pagination.limit,
    10,
  );
  // Test 5: Test filtering by is_primary
  const primaryOnlyResponse: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(sellerConnection, {
      productId,
      body: {
        is_primary: true,
      },
    });
  typia.assert(primaryOnlyResponse);
  // Validate all returned images are primary
  if (primaryOnlyResponse.data.length > 0) {
    const allPrimary = primaryOnlyResponse.data.every(
      (img) => img.is_primary === true,
    );
    TestValidator.predicate("all images are primary when filtered", allPrimary);
  }
  // Test 6: Test sorting range filtering
  const rangeResponse: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(sellerConnection, {
      productId,
      body: {
        sort_order_min: 0,
        sort_order_max: 5,
      },
    });
  typia.assert(rangeResponse);
  // Validate sort order range
  if (rangeResponse.data.length > 0) {
    const inRange = rangeResponse.data.every(
      (img) => img.sort_order >= 0 && img.sort_order <= 5,
    );
    TestValidator.predicate("all images in sort_order range [0,5]", inRange);
  }
}
