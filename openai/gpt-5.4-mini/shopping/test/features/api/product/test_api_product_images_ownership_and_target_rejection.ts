import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_images_create } from "../../../generate/generate_random_mall_platform_seller_products_images_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_images_ownership_and_target_rejection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a seller cannot patch another seller's product image gallery.
   *
   * This scenario verifies the ownership rule for product image maintenance and ensures a non-owning seller cannot mutate the gallery of a product they do not own. The request is intentionally well formed so the failure is attributed to authorization/business rules rather than payload shape.
   *
   * 1. Seller A registers and creates a product.
   * 2. Seller A seeds the product with multiple images.
   * 3. Seller B registers separately and attempts to patch Seller A's product images.
   * 4. Validate that the patch request is rejected.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const ownerProduct =
    await generate_random_mall_platform_seller_products_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(ownerProduct);
  await generate_random_mall_platform_seller_products_images_create(
    ownerConnection,
    {
      params: { productId: ownerProduct.id },
      body: {
        imageUrl: typia.random<string & tags.Format<"url">>(),
        sortOrder: 0,
        isMain: true,
      } satisfies IMallPlatformProductImage.ICreate,
    },
  );
  await generate_random_mall_platform_seller_products_images_create(
    ownerConnection,
    {
      params: { productId: ownerProduct.id },
      body: {
        imageUrl: typia.random<string & tags.Format<"url">>(),
        sortOrder: 1,
        isMain: false,
      } satisfies IMallPlatformProductImage.ICreate,
    },
  );
  const intruderConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.error(
    "non-owner image patch should be rejected",
    async () => {
      await api.functional.mallPlatform.products.images.index(
        intruderConnection,
        {
          productId: ownerProduct.id,
          body: {
            images: [
              {
                imageUrl: typia.random<string & tags.Format<"url">>(),
                sortOrder: 0,
                isMain: true,
              },
            ],
            deleteImageIds: [],
            page: 1,
            limit: 100,
          } satisfies IMallPlatformProductImage.IRequest,
        },
      );
    },
  );
}
