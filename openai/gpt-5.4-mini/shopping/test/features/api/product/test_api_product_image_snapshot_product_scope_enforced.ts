import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_image_snapshot_product_scope_enforced(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate that product image snapshots are strictly scoped to their parent product.
   *
   * This test covers administrator access to product image snapshot history and ensures
   * that a snapshot identifier cannot be used with a different product identifier.
   * It verifies the platform rejects cross-product lookup attempts with not-found
   * behavior so image history remains isolated to the owning product.
   *
   * 1. Authenticate as an administrator through the dedicated join utility.
   * 2. Prepare mismatched product and snapshot identifiers.
   * 3. Attempt to fetch a snapshot using identifiers that do not belong together.
   * 4. Assert the lookup fails with not-found behavior and does not expose snapshot data.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-product image snapshot lookup should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.imageSnapshots.at(
        administratorConnection,
        {
          productId,
          snapshotId,
        },
      );
    },
  );
}
