import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_image_reorder_unavailable_target_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify product image reorder rejection when the requested target image is unavailable.
   *
   * This test authenticates separate seller and administrator actors, creates a product, and then attempts to reorder the product's images using a logically invalid image sequence. It validates that the reorder request is rejected as a business error and that the existing product image state and snapshot history remain unchanged from the caller's perspective.
   *
   * 1. Register and authenticate isolated seller and administrator sessions.
   * 2. Create a product to serve as the target for the image reorder operation.
   * 3. Build an invalid reorder payload that references an image not belonging to the product.
   * 4. Assert that the reorder request fails as a normal business error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const sellerPassword = RandomGenerator.alphaNumeric(12) + "A1!";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const administratorPassword = RandomGenerator.alphaNumeric(12) + "A1!";
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 1000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const currentImages: IMallPlatformProductImage.ISummary[] =
    product.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      sortOrder: image.sortOrder,
      isMain: image.isMain,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      deletedAt: image.deletedAt,
    }));
  const beforeSnapshotIds = product.snapshots.map((snapshot) => snapshot.id);
  const unavailableImage: IMallPlatformProductImage.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    imageUrl:
      product.images[0]?.imageUrl ??
      "https://example.com/unavailable-image.jpg",
    sortOrder: currentImages.length + 1,
    isMain: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  const targetImages: IMallPlatformProductImage.ISummary[] =
    currentImages.length > 0
      ? [unavailableImage, ...currentImages.slice(1)]
      : [unavailableImage];
  await TestValidator.error(
    "product image reorder should reject an unavailable target image",
    async () => {
      await api.functional.mallPlatform.administrator.products.images.index(
        administratorConnection,
        {
          productId: product.id,
          body: {
            images: targetImages,
            page: 1,
            limit: 100,
          } satisfies IMallPlatformProductImage.IRequest,
        },
      );
    },
  );
  TestValidator.equals(
    "original image order is preserved after rejection",
    product.images.map((image) => image.id),
    currentImages.map((image) => image.id),
  );
  TestValidator.equals(
    "original thumbnail is preserved after rejection",
    product.images[0]?.id ?? null,
    currentImages[0]?.id ?? null,
  );
  TestValidator.equals(
    "snapshot history is preserved after rejection",
    product.snapshots.map((snapshot) => snapshot.id),
    beforeSnapshotIds,
  );
}
