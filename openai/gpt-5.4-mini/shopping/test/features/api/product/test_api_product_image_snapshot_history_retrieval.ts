import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
import type { IPageIMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImageSnapshot";
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
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_image_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
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
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  const addedImages =
    await api.functional.mallPlatform.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          images: [
            {
              imageUrl: `https://example.com/products/${product.id}/image-1.jpg`,
              sortOrder: 1,
              isMain: true,
            } satisfies IMallPlatformProductImage.ICreate,
            {
              imageUrl: `https://example.com/products/${product.id}/image-2.jpg`,
              sortOrder: 2,
              isMain: false,
            } satisfies IMallPlatformProductImage.ICreate,
          ],
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(addedImages);
  const snapshots =
    await api.functional.mallPlatform.seller.products._imageSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          pageSize: 10,
          sort: "newest",
          limit: 10,
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate("snapshot page is sorted newest first", () =>
    snapshots.data.every(
      (snapshot, index, array) =>
        index === 0 || array[index - 1].changedAt >= snapshot.changedAt,
    ),
  );
  TestValidator.predicate(
    "snapshot page references the created product",
    snapshots.data.every((snapshot) => snapshot.product.id === product.id),
  );
  TestValidator.predicate(
    "snapshot entries preserve image history fields",
    snapshots.data.every(
      (snapshot) =>
        typeof snapshot.imageUrl === "string" &&
        typeof snapshot.imageOrder === "number" &&
        typeof snapshot.isMain === "boolean" &&
        typeof snapshot.changedAt === "string",
    ),
  );
  const emptyPage =
    await api.functional.mallPlatform.seller.products._imageSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 9999,
          pageSize: 10,
          sort: "newest",
          limit: 10,
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty snapshot page data", emptyPage.data.length, 0);
}
