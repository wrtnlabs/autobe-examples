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
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
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

export async function test_api_product_snapshot_history_product_scoped_pagination(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Snapshot product ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 12000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const firstImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: "https://example.com/product-a.jpg",
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
          imageUrl: "https://example.com/product-b.jpg",
          sortOrder: 1,
          isMain: false,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  const firstPage =
    await api.functional.mallPlatform.seller.productSnapshots.history.index(
      sellerConnection,
      {
        body: {
          productId: product.id,
          page: 1,
          limit: 2,
          sort: "-createdAt",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page stays within the requested product scope",
    firstPage.data.every((snapshot) => snapshot.product.id === product.id),
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page records match page length",
    firstPage.pagination.records >= firstPage.data.length,
    true,
  );
  TestValidator.equals(
    "first page pages consistent",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  if (firstPage.data.length >= 2) {
    TestValidator.predicate(
      "first page is ordered newest first",
      firstPage.data[0].createdAt > firstPage.data[1].createdAt ||
        (firstPage.data[0].createdAt === firstPage.data[1].createdAt &&
          firstPage.data[0].id !== firstPage.data[1].id),
    );
  }
  const secondPage =
    await api.functional.mallPlatform.seller.productSnapshots.history.index(
      sellerConnection,
      {
        body: {
          productId: product.id,
          page: 2,
          limit: 2,
          sort: "-createdAt",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "second page stays within the requested product scope",
    secondPage.data.every((snapshot) => snapshot.product.id === product.id),
  );
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page pages consistent",
    secondPage.pagination.pages,
    Math.ceil(secondPage.pagination.records / secondPage.pagination.limit),
  );
  if (secondPage.data.length > 0 && firstPage.data.length > 0) {
    TestValidator.predicate(
      "first page is newer than second page",
      firstPage.data[0].createdAt >= secondPage.data[0].createdAt,
    );
  }
  const beforeLaterChange =
    await api.functional.mallPlatform.seller.productSnapshots.history.index(
      sellerConnection,
      {
        body: {
          productId: product.id,
          page: 1,
          limit: 2,
          sort: "-createdAt",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(beforeLaterChange);
  const laterImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: "https://example.com/product-c.jpg",
          sortOrder: 2,
          isMain: false,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(laterImage);
  const afterLaterChange =
    await api.functional.mallPlatform.seller.productSnapshots.history.index(
      sellerConnection,
      {
        body: {
          productId: product.id,
          page: 1,
          limit: 2,
          sort: "-createdAt",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(afterLaterChange);
  TestValidator.predicate(
    "after later change the results remain product-scoped",
    afterLaterChange.data.every(
      (snapshot) => snapshot.product.id === product.id,
    ),
  );
  TestValidator.equals(
    "page size preserved",
    afterLaterChange.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page number preserved",
    afterLaterChange.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records do not decrease after later snapshot",
    afterLaterChange.pagination.records >= beforeLaterChange.pagination.records,
  );
  TestValidator.equals(
    "page count remains consistent after later snapshot",
    afterLaterChange.pagination.pages,
    Math.ceil(
      afterLaterChange.pagination.records / afterLaterChange.pagination.limit,
    ),
  );
  if (beforeLaterChange.data.length > 0 && afterLaterChange.data.length > 0) {
    TestValidator.predicate(
      "newest snapshot is refreshed after later product change",
      afterLaterChange.data[0].createdAt >= beforeLaterChange.data[0].createdAt,
    );
  }
  const rereadSecondPage =
    await api.functional.mallPlatform.seller.productSnapshots.history.index(
      sellerConnection,
      {
        body: {
          productId: product.id,
          page: 2,
          limit: 2,
          sort: "-createdAt",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(rereadSecondPage);
  TestValidator.predicate(
    "re-read second page remains product-scoped",
    rereadSecondPage.data.every(
      (snapshot) => snapshot.product.id === product.id,
    ),
  );
  TestValidator.equals(
    "re-read second page current",
    rereadSecondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "re-read second page limit",
    rereadSecondPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "re-read second page pagination stays stable or grows after later snapshot",
    rereadSecondPage.pagination.records >= secondPage.pagination.records,
  );
}
