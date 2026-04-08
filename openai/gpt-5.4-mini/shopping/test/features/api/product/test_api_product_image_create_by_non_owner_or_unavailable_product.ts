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
 * Verifies that a seller cannot create a product image for a product they do not own or cannot maintain.
 *
 * This test validates the access-control and availability rules for product image creation on seller-managed products. It ensures that a rejected image-creation attempt does not succeed when the caller is not the owner or the target product is otherwise unavailable for maintenance.
 *
 * 1. Registers an authenticated seller session used as the caller.
 * 2. Attempts to create a product image for a target product identifier that the seller does not own.
 * 3. Confirms the API rejects the request and does not permit gallery modification.
 */
export async function test_api_product_image_create_by_non_owner_or_unavailable_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@example.com` satisfies string,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
    sortOrder: 0,
    isMain: true,
  } satisfies IMallPlatformProductImage.ICreate;
  await TestValidator.httpError(
    "non-owner or unavailable product image creation should be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.images.create(
        sellerConnection,
        {
          productId,
          body,
        },
      );
    },
  );
}
