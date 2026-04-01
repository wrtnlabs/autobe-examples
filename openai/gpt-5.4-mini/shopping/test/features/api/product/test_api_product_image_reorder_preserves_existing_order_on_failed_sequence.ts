import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
import { generate_random_mall_platform_seller_products_images_create } from "../../../generate/generate_random_mall_platform_seller_products_images_create";
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_image_reorder_preserves_existing_order_on_failed_sequence(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoin.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.ILogin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const images = await ArrayUtil.asyncMap([1, 2, 3], async (index) => {
    const image =
      await generate_random_mall_platform_seller_products_images_create(
        sellerConnection,
        {
          params: { productId },
          body: {
            imageUrl: `https://example.com/product-${index}.jpg`,
            sortOrder: index,
            isMain: index === 1,
          } satisfies IMallPlatformProductImage.ICreate,
        },
      );
    typia.assert(image);
    return image;
  });
  const before = images.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const beforeIds = before.map((item) => item.id);
  const beforeMainFlags = before.map((item) => item.isMain);
  const beforeUrls = before.map((item) => item.imageUrl);
  await TestValidator.error("invalid image reorder should fail", async () => {
    await api.functional.mallPlatform.administrator.products.images.reorder.reorderProductImages(
      adminConnection,
      {
        productId,
        body: {
          imageUrl: "https://example.com/not-attached.jpg",
        } satisfies IMallPlatformProductImage.IUpdate,
      },
    );
  });
  const after = images.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const afterIds = after.map((item) => item.id);
  const afterMainFlags = after.map((item) => item.isMain);
  const afterUrls = after.map((item) => item.imageUrl);
  TestValidator.equals(
    "image IDs should remain unchanged",
    afterIds,
    beforeIds,
  );
  TestValidator.equals(
    "image main flags should remain unchanged",
    afterMainFlags,
    beforeMainFlags,
  );
  TestValidator.equals(
    "image URLs should remain unchanged",
    afterUrls,
    beforeUrls,
  );
}
