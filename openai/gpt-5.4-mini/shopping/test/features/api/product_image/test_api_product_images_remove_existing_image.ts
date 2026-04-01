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

export async function test_api_product_images_remove_existing_image(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(administrator);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const existingImageId = typia.random<string & tags.Format<"uuid">>();
  const remainingImageId = typia.random<string & tags.Format<"uuid">>();
  const initialRequest = {
    removedImageIds: [existingImageId],
    reorderedImageIds: [remainingImageId],
    page: 1,
    limit: 20,
  } satisfies IMallPlatformProductImage.IRequest;
  const updated =
    await api.functional.mallPlatform.administrator.products.images.index(
      adminConnection,
      {
        productId,
        body: initialRequest,
      },
    );
  typia.assert(updated);
  TestValidator.predicate(
    "returned image page has non-negative pagination",
    updated.pagination.current >= 0 &&
      updated.pagination.limit >= 0 &&
      updated.pagination.records >= 0 &&
      updated.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned image collection is ordered consistently",
    updated.data.every(
      (image, index, array) =>
        index === 0 || array[index - 1].sortOrder <= image.sortOrder,
    ),
  );
  const repeatedRemovalRequest = {
    removedImageIds: [existingImageId],
    page: 1,
    limit: 20,
  } satisfies IMallPlatformProductImage.IRequest;
  await TestValidator.error(
    "removing the same image twice should be rejected",
    async () => {
      await api.functional.mallPlatform.administrator.products.images.index(
        adminConnection,
        {
          productId,
          body: repeatedRemovalRequest,
        },
      );
    },
  );
}
