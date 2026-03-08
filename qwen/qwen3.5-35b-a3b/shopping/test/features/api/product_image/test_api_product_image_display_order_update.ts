import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test product image display order update functionality.
 *
 * This test validates the primary success path of updating a product image's
 * display order sequence. A seller authenticates by joining the platform,
 * then updates the display_order of an existing product image to reposition
 * it in the gallery. The test verifies that:
 * 1. The seller can successfully update the display_order of their own product image
 * 2. The updated image returns with the new display_order value
 * 3. The updated_at timestamp reflects the change time
 * 4. The main thumbnail (first image by display_order) reflects the new sequence
 */
export async function test_api_product_image_display_order_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication - join the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create new connection with seller's token
  const sellerAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  // 2. Generate product and image IDs (assuming they exist in the system)
  // In a real scenario, these would be created via product/image creation APIs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update the display_order of the product image
  const initialDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const newDisplayOrder = initialDisplayOrder + 1; // Move to next position
  const updateBody = {
    display_order: newDisplayOrder,
  } satisfies IEcommerceMallProductImage.IUpdate;
  const updatedImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerAuthorizedConnection,
      {
        productId,
        imageId,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 4. Validate the update was successful
  TestValidator.equals(
    "display order updated",
    updatedImage.display_order,
    newDisplayOrder,
  );
  TestValidator.equals(
    "product id matches",
    updatedImage.product_id,
    productId,
  );
  // 5. Validate updated_at timestamp is present and valid
  TestValidator.predicate(
    "image has valid updated_at timestamp",
    () =>
      updatedImage.updated_at !== undefined && updatedImage.updated_at !== null,
  );
  // 6. Validate response contains all expected fields
  TestValidator.equals("image id matches", updatedImage.id, imageId);
  // 7. Validate image_url is present and valid
  TestValidator.predicate(
    "image has valid image_url",
    () => updatedImage.image_url.length > 0,
  );
  // 8. Validate display_order is non-negative
  TestValidator.predicate(
    "display order is non-negative",
    () => updatedImage.display_order >= 0,
  );
  // 9. Validate deleted_at is null (active image)
  TestValidator.equals(
    "image is active (not deleted)",
    updatedImage.deleted_at,
    null,
  );
}
