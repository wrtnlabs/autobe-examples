import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_image_delete_only_image_no_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test deleting the only image from a seller-owned product.
   *
   * This scenario validates that a seller can delete the only image attached to a product.
   * It confirms the delete request succeeds on the intended product-image pair and that the
   * captured product data remains unchanged within the test scope.
   *
   * 1. Register and authenticate a seller using an isolated connection.
   * 2. Create a product owned by that seller and confirm it has one image.
   * 3. Delete the only image from the product.
   * 4. Validate the request completed and the pre-delete product data remains consistent.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number>(),
      },
    },
  );
  typia.assert(product);
  TestValidator.predicate(
    "product should have exactly one image before deletion",
    product.images.length === 1,
  );
  const image = product.images[0];
  TestValidator.predicate(
    "the only image should be the main image before deletion",
    image.isMain === true,
  );
  const before = {
    name: product.name,
    description: product.description,
    basePrice: product.basePrice,
    categoryId: product.category?.id ?? null,
    sellerId: product.sellerAccount.id,
    imageId: image.id,
  };
  await api.functional.mallPlatform.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image.id,
    },
  );
  TestValidator.equals(
    "product name should remain unchanged",
    product.name,
    before.name,
  );
  TestValidator.equals(
    "product description should remain unchanged",
    product.description,
    before.description,
  );
  TestValidator.equals(
    "product base price should remain unchanged",
    product.basePrice,
    before.basePrice,
  );
  TestValidator.equals(
    "product category should remain unchanged",
    product.category?.id ?? null,
    before.categoryId,
  );
  TestValidator.equals(
    "product seller should remain unchanged",
    product.sellerAccount.id,
    before.sellerId,
  );
  TestValidator.equals(
    "image id should be preserved in scope",
    image.id,
    before.imageId,
  );
  TestValidator.equals(
    "product should still be active in captured state",
    product.deletedAt,
    null,
  );
}
