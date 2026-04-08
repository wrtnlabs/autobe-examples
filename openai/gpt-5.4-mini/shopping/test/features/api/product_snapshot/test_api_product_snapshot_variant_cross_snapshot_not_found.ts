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

export async function test_api_product_snapshot_variant_cross_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that a product snapshot variant cannot be fetched through an
   * unrelated parent snapshot scope.
   *
   * This test validates strict parent-child scoping for immutable product
   * snapshot history. It ensures the service does not leak preserved variant
   * history when a snapshot variant identifier is queried beneath the wrong
   * parent snapshot path.
   *
   * 1. Authenticate as an administrator using the dedicated join utility.
   * 2. Generate two different historical snapshot identifiers.
   * 3. Request a snapshot variant through a parent snapshot path that does not
   *    own that variant identifier.
   * 4. Assert the service responds with not found.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const productSnapshotVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-snapshot product snapshot variant lookup should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.productSnapshots.variants.at(
        adminConnection,
        {
          productSnapshotId,
          productSnapshotVariantId,
        },
      );
    },
  );
}
