import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_images_create } from "../../../generate/generate_random_mall_platform_seller_products_images_create";
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

/**
 * Test ordered insertion when a seller adds a new image to an owned product gallery.
 *
 * Validates that seller authentication is isolated, the image creation payload can
 * target a specific gallery position, and the API returns the created image with
 * the expected display metadata for the product association.
 *
 * This scenario focuses on business-visible ordering data rather than internal
 * persistence details. It confirms the newly created image preserves the requested
 * sort order and thumbnail flag, and that the image remains attached to the target
 * product after creation.
 *
 * 1. Authenticate a seller using an isolated seller connection.
 * 2. Create a product image with an explicit order and thumbnail flag.
 * 3. Validate the returned image fields match the submitted payload.
 * 4. Confirm the image is associated with the requested product.
 */
export async function test_api_product_image_create_with_ordered_insertion(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const sortOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const created =
    await api.functional.mallPlatform.seller.products.images.create(
      sellerConnection,
      {
        productId,
        body: {
          imageUrl,
          sortOrder,
          isMain: false,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("created image url", created.imageUrl, imageUrl);
  TestValidator.equals(
    "created image sort order",
    created.sortOrder,
    sortOrder,
  );
  TestValidator.equals("created image main flag", created.isMain, false);
  TestValidator.equals(
    "created image product id",
    created.product.id,
    productId,
  );
}
