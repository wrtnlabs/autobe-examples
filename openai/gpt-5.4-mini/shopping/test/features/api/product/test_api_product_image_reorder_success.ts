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

/**
 * Reorder a product's image gallery and verify the thumbnail behavior.
 *
 * Validates that a product image gallery reorder request succeeds for the product owner context, that the first image becomes the thumbnail used for listings and detail presentation, and that the returned paginated image summary matches the requested order.
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a product that will own the image gallery.
 * 3. Submit a full reordered image list to the product image endpoint.
 * 4. Validate the response order, pagination metadata, and thumbnail flag handling.
 */
export async function test_api_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${RandomGenerator.alphabets(8)}@test.com`,
      password: `Pw${RandomGenerator.alphaNumeric(10)}`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Product ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  const requestedImages: IMallPlatformProductImage.ISummary[] = [
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
      sortOrder: 1,
      isMain: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
      sortOrder: 2,
      isMain: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
      sortOrder: 3,
      isMain: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
  ];
  const output =
    await api.functional.mallPlatform.administrator.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          images: [requestedImages[2], requestedImages[0], requestedImages[1]],
          page: 1,
          limit: 100,
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("reordered image count", output.data.length, 3);
  TestValidator.equals(
    "first image becomes thumbnail",
    output.data[0]?.isMain,
    true,
  );
  TestValidator.equals(
    "returned image order matches request",
    output.data.map((image) => image.id),
    [requestedImages[2].id, requestedImages[0].id, requestedImages[1].id],
  );
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 100);
  TestValidator.equals(
    "thumbnail flag follows first image",
    output.data[0]?.id,
    requestedImages[2].id,
  );
  TestValidator.predicate("all non-first images remain non-main", () =>
    output.data.slice(1).every((image) => image.isMain === false),
  );
}
