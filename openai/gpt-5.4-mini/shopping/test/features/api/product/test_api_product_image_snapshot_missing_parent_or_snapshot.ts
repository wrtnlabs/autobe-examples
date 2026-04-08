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

export async function test_api_product_image_snapshot_missing_parent_or_snapshot(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate not-found behavior for missing parent product or missing image snapshot.
   *
   * This test exercises the administrator-only image snapshot lookup endpoint in two
   * not-found scenarios using isolated administrator authentication. It verifies that
   * the lookup fails when the parent product identifier does not exist and also fails
   * when the snapshot identifier does not belong to the requested product context.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Call the image snapshot lookup with non-existent identifiers and assert
   *    not-found behavior.
   * 3. Call the image snapshot lookup again with another unmatched identifier pair
   *    and assert not-found behavior.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId1 = typia.random<string & tags.Format<"uuid">>();
  const snapshotId1 = typia.random<string & tags.Format<"uuid">>();
  const productId2 = typia.random<string & tags.Format<"uuid">>();
  const snapshotId2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing parent product should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.imageSnapshots.at(
        adminConnection,
        {
          productId: productId1,
          snapshotId: snapshotId1,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing snapshot within product scope should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.imageSnapshots.at(
        adminConnection,
        {
          productId: productId2,
          snapshotId: snapshotId2,
        },
      );
    },
  );
}
