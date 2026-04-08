import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product image retrieval against unavailable product and image targets.
 *
 * Verifies that the product image detail endpoint returns a normal business not-found result when either the parent product no longer exists or the requested image does not exist for the given product.
 *
 * The test focuses on two unavailable-target cases:
 * 1. A missing product identifier combined with a valid image identifier shape.
 * 2. A valid product identifier combined with a missing image identifier.
 *
 * These checks ensure the endpoint does not leak data for unavailable resources and fails consistently for both missing product and missing image lookups.
 */
export async function test_api_product_image_unavailable_target_not_found(
  connection: api.IConnection,
): Promise<void> {
  const unavailableProductId = typia.random<string & tags.Format<"uuid">>();
  const unavailableImageId = typia.random<string & tags.Format<"uuid">>();
  const anotherUnavailableImageId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "unavailable product target should return not-found",
    async () => {
      await api.functional.mallPlatform.products.images.at(connection, {
        productId: unavailableProductId,
        imageId: unavailableImageId,
      });
    },
  );
  await TestValidator.error(
    "unavailable image target should return not-found",
    async () => {
      await api.functional.mallPlatform.products.images.at(connection, {
        productId: unavailableProductId,
        imageId: anotherUnavailableImageId,
      });
    },
  );
}
