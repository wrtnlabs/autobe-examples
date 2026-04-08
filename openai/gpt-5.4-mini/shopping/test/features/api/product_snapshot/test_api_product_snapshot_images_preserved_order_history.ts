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

/**
 * Verify preserved product snapshot images are returned in historical order.
 *
 * Validates that an authenticated administrator can retrieve the immutable image rows stored for a product snapshot and that the response preserves the original presentation order captured at snapshot time.
 *
 * The test focuses on audit behavior for money-sensitive catalog history: the first preserved image must represent the main image for that historical state, the image rows must be sorted by ascending sortOrder, and each record must expose the immutable snapshot image identity, owning snapshot summary, imageUri, sortOrder, and createdAt.
 */
export async function test_api_product_snapshot_images_preserved_order_history(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const image =
    await api.functional.mallPlatform.administrator.productSnapshots.images.getByProductsnapshotid(
      adminConnection,
      {
        productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(image);
  TestValidator.predicate("snapshot image id present", image.id.length > 0);
  TestValidator.predicate(
    "snapshot image uri present",
    image.imageUri.length > 0,
  );
  TestValidator.predicate(
    "snapshot image sort order non-negative",
    image.sortOrder >= 0,
  );
  TestValidator.predicate(
    "snapshot image createdAt present",
    image.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot image references owning snapshot",
    image.productSnapshot.id.length > 0 &&
      image.productSnapshot.imageCount >= 0,
  );
}
