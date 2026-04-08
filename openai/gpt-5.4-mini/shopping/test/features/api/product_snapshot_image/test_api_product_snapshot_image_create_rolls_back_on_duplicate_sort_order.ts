import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_product_snapshots_images_create } from "../../../generate/generate_random_mall_platform_administrator_product_snapshots_images_create";
import { prepare_random_mall_platform_product_snapshot_image } from "../../../prepare/prepare_random_mall_platform_product_snapshot_image";

export async function test_api_product_snapshot_image_create_rolls_back_on_duplicate_sort_order(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const sortOrder = 0;
  const firstImageUri = `./${RandomGenerator.alphaNumeric(12)}.jpg`;
  const created =
    await generate_random_mall_platform_administrator_product_snapshots_images_create(
      administratorConnection,
      {
        params: { productSnapshotId },
        body: {
          imageUri: firstImageUri,
          sortOrder,
        } satisfies IMallPlatformProductSnapshotImage.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created row keeps snapshot id",
    created.productSnapshot.id,
    productSnapshotId,
  );
  TestValidator.equals(
    "created row keeps image uri",
    created.imageUri,
    firstImageUri,
  );
  TestValidator.equals(
    "created row keeps sort order",
    created.sortOrder,
    sortOrder,
  );
  await TestValidator.httpError(
    "duplicate sort order request should be rejected",
    [400, 409, 422],
    async () => {
      await generate_random_mall_platform_administrator_product_snapshots_images_create(
        administratorConnection,
        {
          params: { productSnapshotId },
          body: {
            imageUri: `./${RandomGenerator.alphaNumeric(12)}.png`,
            sortOrder,
          } satisfies IMallPlatformProductSnapshotImage.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original row remains unchanged after rollback",
    created.productSnapshot.id,
    productSnapshotId,
  );
  TestValidator.equals(
    "original image uri remains unchanged after rollback",
    created.imageUri,
    firstImageUri,
  );
  TestValidator.equals(
    "original sort order remains unchanged after rollback",
    created.sortOrder,
    sortOrder,
  );
}
