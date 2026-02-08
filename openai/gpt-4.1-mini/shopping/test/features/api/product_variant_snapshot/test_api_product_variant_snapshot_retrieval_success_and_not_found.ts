import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // The authorize_administrator_join updates adminConnection.headers internally, so no manual header setting needed
  // 2. Test success path with a simulated valid snapshotId
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.administrator.productVariantSnapshots.at(
      adminConnection,
      { snapshotId: validSnapshotId },
    );
  typia.assert(snapshot);
  // 3. Test 404 Not Found error on non-existent snapshotId
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetching non-existent snapshot returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productVariantSnapshots.at(
        adminConnection,
        { snapshotId: nonExistentSnapshotId },
      );
    },
  );
}
