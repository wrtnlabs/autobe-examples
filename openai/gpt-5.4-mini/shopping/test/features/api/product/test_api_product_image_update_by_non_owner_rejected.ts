import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_image_update_by_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller-a/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller-b/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const ownedImageId = typia.random<string & tags.Format<"uuid">>();
  const foreignImageId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    imageUrl: "https://example.com/product-image.jpg",
    sortOrder: 1,
    isMain: false,
  } satisfies IMallPlatformProductImage.IUpdate;
  await TestValidator.httpError(
    "non-owner seller must not update another seller's product image",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.images.update(
        sellerBConnection,
        {
          productId,
          imageId: ownedImageId,
          body: updateBody,
        },
      );
    },
  );
  await TestValidator.httpError(
    "imageId that does not belong to the specified product must be rejected",
    [400, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.images.update(
        sellerAConnection,
        {
          productId,
          imageId: foreignImageId,
          body: {
            imageUrl: "https://example.com/product-image-2.jpg",
            sortOrder: 2,
            isMain: true,
          } satisfies IMallPlatformProductImage.IUpdate,
        },
      );
    },
  );
}
