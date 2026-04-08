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

export async function test_api_product_images_reorder_main_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product image gallery reordering and main thumbnail selection.
   *
   * Validates that the owning seller can maintain a product's ordered image set
   * through the product image management endpoint, and that the first image in
   * the returned sequence is treated as the main thumbnail.
   *
   * The scenario focuses on business-visible gallery behavior:
   * 1. a seller must own the product being updated,
   * 2. the product must already have multiple images,
   * 3. reordering must be reflected in the paginated response, and
   * 4. exactly one image should be marked as the main image after the update.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
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
  typia.assert(product);
  const images = await ArrayUtil.asyncRepeat(3, async (index) => {
    const image =
      await generate_random_mall_platform_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            imageUrl: typia.random<string & tags.Format<"url">>(),
            sortOrder: index,
            isMain: index === 0,
          } satisfies IMallPlatformProductImage.ICreate,
        },
      );
    typia.assert(image);
    return image;
  });
  const initialOrder = [...images].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const desiredOrder = [initialOrder[2], initialOrder[0], initialOrder[1]];
  const page = await api.functional.mallPlatform.products.images.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        images: desiredOrder.map((image, index) => ({
          imageUrl: image.imageUrl,
          sortOrder: index,
          isMain: index === 0,
        })) satisfies IMallPlatformProductImage.ICreate[],
        deleteImageIds: [],
        page: 1,
        limit: 100,
      } satisfies IMallPlatformProductImage.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "reordered gallery retains the same number of images",
    page.data.length,
    images.length,
  );
  TestValidator.equals(
    "gallery order matches the requested reorder sequence",
    page.data.map((image) => image.imageUrl),
    desiredOrder.map((image) => image.imageUrl),
  );
  TestValidator.equals(
    "first image in the reordered gallery is the main thumbnail",
    page.data[0]?.isMain,
    true,
  );
  TestValidator.predicate(
    "exactly one image is marked as main",
    page.data.filter((image) => image.isMain).length === 1,
  );
  TestValidator.equals(
    "page starts at the first page",
    page.pagination.current,
    1,
  );
  TestValidator.equals("page limit is preserved", page.pagination.limit, 100);
  TestValidator.equals(
    "returned images belong to the same product",
    page.data.every((image) => image.product.id === product.id),
    true,
  );
}
