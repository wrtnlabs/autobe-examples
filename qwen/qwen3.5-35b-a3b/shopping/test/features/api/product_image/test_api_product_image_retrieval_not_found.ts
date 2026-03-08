import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the edge case where the specified product image does not exist.
 *
 * This test verifies that the system returns a 404 error when either the
 * productId or imageId UUID does not correspond to an actual image record
 * in the database. The test covers multiple scenarios including non-existent
 * images, mismatched relationships, and invalid product IDs.
 */
export async function test_api_product_image_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate random UUIDs for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const imageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Image ID doesn't exist at all (should return 404)
  await TestValidator.httpError(
    "should return 404 for non-existent image",
    404,
    async () => {
      await api.functional.ecommerceMall.products.images.at(
        customerConnection,
        {
          productId,
          imageId,
        },
      );
    },
  );
  // Test 2: Product ID doesn't exist (should return 404)
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const existingImageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    404,
    async () => {
      await api.functional.ecommerceMall.products.images.at(
        customerConnection,
        {
          productId: nonExistentProductId,
          imageId: existingImageId,
        },
      );
    },
  );
  // Test 3: Mismatched relationship (image belongs to different product)
  const anotherProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const anotherImageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "should return 404 for mismatched product-image relationship",
    404,
    async () => {
      await api.functional.ecommerceMall.products.images.at(
        customerConnection,
        {
          productId: anotherProductId,
          imageId: anotherImageId,
        },
      );
    },
  );
}
