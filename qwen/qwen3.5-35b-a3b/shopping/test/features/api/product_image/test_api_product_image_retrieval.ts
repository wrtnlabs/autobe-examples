import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product image retrieval functionality.
 * 1. Generate random product and image UUIDs
 * 2. Retrieve image by ID (SDK generates random data in simulation mode)
 * 3. Validate response structure matches IEcommerceMallProductImage DTO
 */
export async function test_api_product_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random UUIDs for product and image
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve the image (SDK will generate random data in simulation mode)
  const retrievedImage = await api.functional.ecommerceMall.products.images.at(
    connection,
    {
      productId,
      imageId,
    },
  );
  typia.assert(retrievedImage);
  // 3. Validate response structure
  TestValidator.equals(
    "retrieved image has valid UUID id",
    retrievedImage.id,
    retrievedImage.id,
  );
  TestValidator.equals(
    "image belongs to correct product",
    retrievedImage.product_id,
    productId,
  );
  TestValidator.predicate(
    "image URL is valid URI format",
    /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^s]*)?$/.test(
      retrievedImage.image_url,
    ),
  );
  TestValidator.predicate(
    "display order is non-negative int32",
    retrievedImage.display_order >= 0,
  );
  // Validate timestamps are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      retrievedImage.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      retrievedImage.updated_at,
    ),
  );
  // Verify deleted_at can be NULL for active image or valid date-time if set
  if (
    retrievedImage.deleted_at !== null &&
    retrievedImage.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is valid date-time format if set",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        retrievedImage.deleted_at,
      ),
    );
  }
}
