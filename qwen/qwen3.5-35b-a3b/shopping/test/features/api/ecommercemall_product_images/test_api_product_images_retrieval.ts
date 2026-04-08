import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product images retrieval endpoint with UUID validation.
 *
 * Validates that product images can be successfully retrieved for existing products using the GET endpoint. The endpoint returns image summary objects containing unique identifiers, image URLs, display order positions, and creation timestamps. Only active images (not soft-deleted) are returned. The test verifies response structure, validates UUID formats, checks image URL structure, and ensures active image status.
 *
 * 1. Generate a valid product UUID for testing.
 * 2. Call the GET endpoint to retrieve product images.
 * 3. Validate response contains required fields (id, image_url, display_order, product, created_at, deleted_at).
 * 4. Verify image UUID format matches specification.
 * 5. Validate display_order is positive integer for sorting.
 * 6. Confirm image is active (deleted_at is null).
 * 7. Test non-existent product returns 404 error.
 */
export async function test_api_product_images_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid product UUID for testing
  const testProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve product images using GET endpoint
  // Note: Endpoint returns single ISummary object, not array
  const image: IEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.at(connection, {
      productId: testProductId,
    });
  typia.assert(image);
  // 3. Validate image id is valid UUID format
  TestValidator.equals(
    "image id is valid uuid",
    image.id,
    typia.assert<string & tags.Format<"uuid">>(image.id),
  );
  // 4. Validate image_url format
  TestValidator.predicate(
    "image_url is valid non-empty string",
    typeof image.image_url === "string" && image.image_url.length > 0,
  );
  TestValidator.predicate(
    "image_url within maxLength 80000",
    image.image_url.length <= 80000,
  );
  // 5. Validate display_order is positive int32
  TestValidator.predicate(
    "display_order is positive integer",
    Number.isInteger(image.display_order) && image.display_order > 0,
  );
  TestValidator.predicate(
    "display_order is int32 range",
    image.display_order >= -2147483648 && image.display_order <= 2147483647,
  );
  // 6. Validate product reference exists and is valid
  TestValidator.predicate(
    "product reference exists",
    image.product !== undefined,
  );
  typia.assert<string & tags.Format<"uuid">>(image.product.id);
  TestValidator.equals(
    "product name is string",
    true,
    typeof image.product.name === "string",
  );
  // 7. Validate created_at is valid date-time format
  typia.assert<string & tags.Format<"date-time">>(image.created_at);
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !Number.isNaN(Date.parse(image.created_at)),
  );
  // 8. Validate deleted_at is null for active image
  // Only active images (deleted_at IS NULL) should be returned
  TestValidator.equals(
    "image is active (deleted_at is null)",
    image.deleted_at,
    null,
  );
  // 9. Test with non-existent product - should return 404
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent product returns error", async () => {
    await api.functional.ecommerceMall.products.images.at(connection, {
      productId: nonExistentProductId,
    });
  });
}
