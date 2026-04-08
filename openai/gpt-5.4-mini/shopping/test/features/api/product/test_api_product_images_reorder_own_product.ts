import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_product_images_reorder_own_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authenticated = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authenticated);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const firstImage = {
    id: typia.random<string & tags.Format<"uuid">>(),
    imageUrl: "https://example.com/main-image.jpg",
    sortOrder: 1 as number & tags.Type<"int32">,
    isMain: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  } satisfies IMallPlatformProductImage.ISummary;
  const secondImage = {
    id: typia.random<string & tags.Format<"uuid">>(),
    imageUrl: "https://example.com/second-image.jpg",
    sortOrder: 2 as number & tags.Type<"int32">,
    isMain: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  } satisfies IMallPlatformProductImage.ISummary;
  const thirdImage = {
    id: typia.random<string & tags.Format<"uuid">>(),
    imageUrl: "https://example.com/third-image.jpg",
    sortOrder: 3 as number & tags.Type<"int32">,
    isMain: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  } satisfies IMallPlatformProductImage.ISummary;
  const response =
    await api.functional.mallPlatform.seller.products.images.index(
      sellerConnection,
      {
        productId,
        body: {
          images: [thirdImage, firstImage, secondImage],
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("reordered image count", response.data.length, 3);
  TestValidator.equals(
    "reordered image sequence",
    response.data.map((image) => image.id),
    [thirdImage.id, firstImage.id, secondImage.id],
  );
  TestValidator.equals(
    "main thumbnail moved to first image",
    response.data[0]?.isMain,
    true,
  );
  TestValidator.equals(
    "all other images are not main",
    response.data.slice(1).every((image) => image.isMain === false),
    true,
  );
}
