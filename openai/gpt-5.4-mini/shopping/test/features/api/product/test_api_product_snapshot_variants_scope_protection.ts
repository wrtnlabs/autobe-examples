import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variants_scope_protection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Ensure snapshot variant history is protected by product scope boundaries.
   *
   * This test validates that the administrator snapshot-variant history endpoint
   * does not leak cross-product snapshot existence. It exercises a valid
   * administrator context and an unauthenticated context, then requests a
   * productId/snapshotId combination that is intentionally mismatched so the
   * server must respond with not found rather than exposing whether the snapshot
   * exists under another product.
   *
   * 1. Create an administrator-authenticated connection using the join utility.
   * 2. Request snapshot variants with mismatched product and snapshot identifiers.
   * 3. Verify the authorized request fails with not found.
   * 4. Verify an unauthenticated request is blocked consistently with not found.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator should not access cross-scope product snapshot variants",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.variants.getByProductidAndSnapshotid(
        administratorConnection,
        {
          productId,
          snapshotId,
        },
      );
    },
  );
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access should also be blocked for snapshot variant history",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.variants.getByProductidAndSnapshotid(
        anonymousConnection,
        {
          productId,
          snapshotId,
        },
      );
    },
  );
}
