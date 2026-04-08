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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_images_create } from "../../../generate/generate_random_mall_platform_seller_products_images_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_image_reorder_with_unavailable_image_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        categoryId: null,
        basePrice: typia.random<number>(),
      },
    },
  );
  typia.assert(product);
  const firstImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
          sortOrder: 0,
          isMain: true,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  const secondImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
          sortOrder: 1,
          isMain: false,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  const thirdImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
          sortOrder: 2,
          isMain: false,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(thirdImage);
  const before =
    await api.functional.mallPlatform.customer.products.images.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          images: [firstImage, secondImage, thirdImage],
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(before);
  const beforeImageIds = before.data.map((item) => item.id);
  const beforeMainImageId = before.data.find((item) => item.isMain)?.id ?? null;
  await TestValidator.error(
    "reordering with a duplicate and missing image should be rejected",
    async () => {
      await api.functional.mallPlatform.customer.products.images.index(
        customerConnection,
        {
          productId: product.id,
          body: {
            images: [secondImage, secondImage, firstImage],
          } satisfies IMallPlatformProductImage.IRequest,
        },
      );
    },
  );
  const after =
    await api.functional.mallPlatform.customer.products.images.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          images: [firstImage, secondImage, thirdImage],
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(after);
  TestValidator.equals(
    "image order should remain unchanged",
    after.data.map((item) => item.id),
    beforeImageIds,
  );
  TestValidator.equals(
    "main thumbnail should remain unchanged",
    after.data.find((item) => item.isMain)?.id ?? null,
    beforeMainImageId,
  );
}
