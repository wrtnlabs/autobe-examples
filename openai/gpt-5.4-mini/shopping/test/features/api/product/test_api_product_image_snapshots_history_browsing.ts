import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
import { generate_random_mall_platform_seller_products_images_create } from "../../../generate/generate_random_mall_platform_seller_products_images_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_image_snapshots_history_browsing(
  connection: api.IConnection,
): Promise<void> {
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
        >() satisfies number as number,
      },
    },
  );
  typia.assert(product);
  const firstImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(12)}-1.jpg`;
  const firstImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: firstImageUrl,
          sortOrder: 0,
          isMain: true,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  const secondImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(12)}-2.jpg`;
  const secondImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: secondImageUrl,
          sortOrder: 1,
          isMain: false,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  const thirdImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(12)}-3.jpg`;
  const thirdImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: thirdImageUrl,
          sortOrder: 2,
          isMain: false,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(thirdImage);
  const history =
    await api.functional.mallPlatform.seller.products.imageSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(history);
  TestValidator.predicate(
    "pagination metadata should be internally consistent",
    history.pagination.current === 1 &&
      history.pagination.limit === 20 &&
      history.pagination.records >= history.data.length &&
      history.pagination.pages >= 0 &&
      history.pagination.pages >=
        Math.ceil(history.pagination.records / history.pagination.limit),
  );
  TestValidator.predicate(
    "snapshot history should contain records for successful image changes",
    history.data.length >= 3,
  );
  TestValidator.predicate(
    "every snapshot should belong to the created product and preserve audit fields",
    history.data.every(
      (snapshot) =>
        snapshot.product.id === product.id &&
        snapshot.product.name === product.name &&
        snapshot.product.sellerAccount.id === product.sellerAccount.id &&
        snapshot.imageUrl.length > 0 &&
        snapshot.imageOrder >= 0 &&
        typeof snapshot.isMain === "boolean" &&
        snapshot.changedAt.length > 0 &&
        snapshot.createdAt.length > 0 &&
        snapshot.updatedAt.length > 0 &&
        snapshot.deletedAt === null,
    ),
  );
  const changedAtList = history.data.map((snapshot) => snapshot.changedAt);
  const newestFirst = [...changedAtList].sort((left, right) =>
    right.localeCompare(left),
  );
  TestValidator.equals(
    "image snapshots should be ordered newest first by default",
    changedAtList,
    newestFirst,
  );
  TestValidator.predicate(
    "the history should preserve multiple distinct image states",
    Array.from(new Set(history.data.map((snapshot) => snapshot.imageUrl)))
      .length >= 2,
  );
  TestValidator.predicate(
    "the latest history entry should correspond to one of the successful image writes",
    [firstImageUrl, secondImageUrl, thirdImageUrl].includes(
      history.data[0].imageUrl,
    ),
  );
  if (history.pagination.records > history.data.length) {
    TestValidator.predicate(
      "pagination should report more total records than the current page when additional pages exist",
      history.pagination.pages >= 2,
    );
  }
}
