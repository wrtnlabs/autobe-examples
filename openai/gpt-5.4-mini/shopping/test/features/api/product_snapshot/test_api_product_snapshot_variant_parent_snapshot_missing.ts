import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variant_parent_snapshot_missing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that a preserved product snapshot variant cannot be resolved without
   * an existing parent product snapshot scope.
   *
   * This test authenticates an administrator, then attempts to retrieve a product
   * snapshot variant using a non-existent parent snapshot identifier together with
   * a valid snapshot-variant identifier. The API must reject the request with a
   * not-found error because child snapshot variants are only accessible through a
   * valid parent snapshot.
   *
   * 1. Authenticate as an administrator using the join endpoint utility.
   * 2. Request a product snapshot variant with a missing parent snapshot id.
   * 3. Verify the endpoint returns a not-found HTTP error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const missingProductSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const preservedSnapshotVariantId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "product snapshot variant requires existing parent snapshot",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.productSnapshots.variants.at(
        adminConnection,
        {
          productSnapshotId: missingProductSnapshotId,
          productSnapshotVariantId: preservedSnapshotVariantId,
        },
      );
    },
  );
}
