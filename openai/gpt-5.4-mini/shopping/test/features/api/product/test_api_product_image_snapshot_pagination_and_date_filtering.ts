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

export async function test_api_product_image_snapshot_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const join = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!`,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(join);
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
  const beforeSnapshots = new Date(Date.now() - 1000 * 60 * 5).toISOString();
  const afterSnapshots = new Date(Date.now() + 1000 * 60 * 5).toISOString();
  const addImage = async (
    index: number,
    sortOrder: number,
    isMain: boolean,
  ) => {
    const response =
      await api.functional.mallPlatform.seller.products.images.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            images: [
              {
                imageUrl: `https://example.com/${product.id}/${index}.jpg`,
                sortOrder,
                isMain,
              } satisfies IMallPlatformProductImage.ICreate,
            ],
            page: 1,
            limit: 50,
          } satisfies IMallPlatformProductImage.IRequest,
        },
      );
    typia.assert(response);
    return response;
  };
  await addImage(1, 1, true);
  await addImage(2, 2, false);
  await addImage(3, 3, false);
  const newestPage =
    await api.functional.mallPlatform.seller.products._imageSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          pageSize: 2,
          sort: "newest",
          from: beforeSnapshots,
          to: afterSnapshots,
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(newestPage);
  TestValidator.equals("newest page current", newestPage.pagination.current, 1);
  TestValidator.equals("newest page limit", newestPage.pagination.limit, 2);
  TestValidator.equals("newest page records", newestPage.pagination.records, 3);
  TestValidator.equals("newest page pages", newestPage.pagination.pages, 2);
  TestValidator.predicate(
    "newest-first order",
    newestPage.data.length <= 1 ||
      newestPage.data[0].changedAt >= newestPage.data[1].changedAt,
  );
  const secondPage =
    await api.functional.mallPlatform.seller.products._imageSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          pageSize: 2,
          sort: "newest",
          from: beforeSnapshots,
          to: afterSnapshots,
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.equals("second page records", secondPage.pagination.records, 3);
  TestValidator.equals("second page pages", secondPage.pagination.pages, 2);
  const emptyPage =
    await api.functional.mallPlatform.seller.products._imageSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          pageSize: 10,
          sort: "newest",
          from: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          to: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty data length", emptyPage.data.length, 0);
}
