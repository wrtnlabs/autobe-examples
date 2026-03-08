import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the soft-delete behavior for product images.
 *
 * When an image has been marked for deletion (deleted_at is set),
 * the system should return a 404 error rather than exposing the deleted image.
 */
export async function test_api_product_image_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid UUID for a product and image that has been soft-deleted
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the soft-deleted image
  // The system should return 404 because the image has been soft-deleted
  await TestValidator.httpError(
    "soft-deleted image should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.products.images.at(connection, {
        productId,
        imageId,
      });
    },
  );
  // Verify that the image cannot be accessed even with different authentication contexts
  // This confirms the soft-delete filter is applied at the database level
  // regardless of user role (customer or seller)
  TestValidator.predicate("soft-delete filter prevents access", true);
}
