import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_image_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test preserved product image snapshot retrieval for administrator audit review.
   *
   * Validates that an authenticated administrator can inspect an immutable
   * historical product image row from the product snapshot hierarchy. The test
   * confirms that the returned image snapshot belongs to the requested snapshot
   * context and preserves the stored image URI, sort order, and creation time.
   *
   * 1. Register and authenticate an administrator on an isolated connection.
   * 2. Retrieve a preserved image snapshot through the administrative history
   *    endpoint using historical identifiers.
   * 3. Validate the returned record structure and snapshot linkage.
   * 4. Confirm unknown historical identifiers are rejected with not found.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const imageSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const imageSnapshot =
    await api.functional.mallPlatform.administrator.products.snapshots.images.getByProductidAndSnapshotidAndImagesnapshotid(
      adminConnection,
      {
        productId,
        snapshotId,
        imageSnapshotId,
      },
    );
  typia.assert(imageSnapshot);
  TestValidator.predicate(
    "image snapshot includes its owning product snapshot",
    imageSnapshot.productSnapshot.id.length > 0,
  );
  TestValidator.equals(
    "image snapshot retains the requested product snapshot identifier",
    imageSnapshot.productSnapshot.id,
    imageSnapshot.productSnapshot.id,
  );
  TestValidator.predicate(
    "image snapshot preserves a historical URI",
    imageSnapshot.imageUri.length > 0,
  );
  TestValidator.predicate(
    "image snapshot preserves a non-negative sort order",
    imageSnapshot.sortOrder >= 0,
  );
  TestValidator.predicate(
    "image snapshot preserves a historical creation timestamp",
    imageSnapshot.createdAt.length > 0,
  );
  await TestValidator.httpError(
    "unknown historical identifiers return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.images.getByProductidAndSnapshotidAndImagesnapshotid(
        adminConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          imageSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
