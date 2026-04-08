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

export async function test_api_product_snapshot_images_product_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate that preserved product snapshot images remain scoped to the owning product.
   *
   * This test authenticates an administrator and then intentionally calls the snapshot-image history endpoint with a product identifier and snapshot identifier that do not belong together. The endpoint must reject the lookup with a not-found error rather than exposing another product's preserved image history.
   *
   * 1. Register an administrator and create an authenticated administrator connection.
   * 2. Generate two different product identifiers and two different snapshot identifiers.
   * 3. Call the snapshot-image endpoint with a mismatched product/snapshot pair.
   * 4. Assert that the request fails with a not-found HTTP error.
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
  const mismatchedSnapshotId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "snapshot ids should be different",
    snapshotId,
    mismatchedSnapshotId,
  );
  await TestValidator.httpError(
    "product snapshot images should reject mismatched product scope",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.images.getByProductidAndSnapshotid(
        adminConnection,
        {
          productId,
          snapshotId: mismatchedSnapshotId,
        },
      );
    },
  );
}
