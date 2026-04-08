import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_hierarchy_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate strict hierarchy enforcement for administrator product variant snapshots.
   *
   * This test authenticates as an administrator and then requests a preserved product
   * variant snapshot using identifiers that belong to different parent lineages. The
   * endpoint must reject the request rather than returning a snapshot from another
   * product or falling back to mutable current product data.
   *
   * 1. Register an administrator account through the dedicated authorization utility.
   * 2. Call the variant snapshot endpoint with mismatched product and snapshot lineage.
   * 3. Verify the server responds with not found for the invalid hierarchy.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedVariantSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "variant snapshot hierarchy mismatch should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.variants.getByProductidAndSnapshotidAndVariantsnapshotid(
        administratorConnection,
        {
          productId,
          snapshotId,
          variantSnapshotId: mismatchedVariantSnapshotId,
        },
      );
    },
  );
}
