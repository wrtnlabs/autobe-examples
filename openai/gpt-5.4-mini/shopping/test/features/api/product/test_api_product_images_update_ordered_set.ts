import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_images_update_ordered_set(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const existingImageId1 = typia.random<string & tags.Format<"uuid">>();
  const existingImageId2 = typia.random<string & tags.Format<"uuid">>();
  const appendedImageUrl = typia.random<string & tags.MaxLength<80000>>();
  const successRequest = {
    reorderedImageIds: [existingImageId2, existingImageId1],
    images: [
      {
        imageUrl: appendedImageUrl,
        sortOrder: 3,
        isMain: false,
      } satisfies IMallPlatformProductImage.ICreate,
    ],
    removedImageIds: [],
    page: 1,
    limit: 10,
  } satisfies IMallPlatformProductImage.IRequest;
  await TestValidator.httpError(
    "updating a non-existent or ineligible product image set should be rejected",
    [403, 404],
    async () => {
      const output =
        await api.functional.mallPlatform.administrator.products.images.index(
          administratorConnection,
          {
            productId,
            body: successRequest,
          },
        );
      typia.assert(output);
    },
  );
  await TestValidator.httpError(
    "referencing an unavailable image id should fail as a business error",
    [400, 404],
    async () => {
      await api.functional.mallPlatform.administrator.products.images.index(
        administratorConnection,
        {
          productId,
          body: {
            reorderedImageIds: [
              existingImageId1,
              typia.random<string & tags.Format<"uuid">>(),
            ],
            images: [],
            removedImageIds: [],
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductImage.IRequest,
        },
      );
    },
  );
}
