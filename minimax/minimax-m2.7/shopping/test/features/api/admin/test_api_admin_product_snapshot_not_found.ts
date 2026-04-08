import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving a non-existent product snapshot as an administrator.
 *
 * Validates that administrators receive proper 404 error feedback when attempting to access product snapshots that do not exist in the system. This is critical for dispute resolution and auditing workflows where administrators need to query historical snapshot data.
 *
 * **Scenario Flow:**
 * 1. Administrator authenticates via join endpoint
 * 2. System generates a random UUID for non-existent snapshot
 * 3. Administrator requests the non-existent snapshot
 * 4. System returns 404 error with descriptive message
 * 5. Test validates error response structure
 *
 * **Expected Behavior:**
 * - HTTP 404 Not Found status code
 * - Error message containing "Product snapshot not found"
 * - Proper error response structure
 */
export async function test_api_admin_product_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a non-existent UUID (valid format but not in database)
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent snapshot and verify 404 error
  await TestValidator.httpError(
    "product snapshot not found returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.admin.product_snapshots.at(
        adminConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
