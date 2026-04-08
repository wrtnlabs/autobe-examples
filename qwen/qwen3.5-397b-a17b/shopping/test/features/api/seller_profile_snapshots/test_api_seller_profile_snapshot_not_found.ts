import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator receives 404 when retrieving non-existent seller profile snapshot.
 *
 * Validates the error handling behavior when an administrator attempts to retrieve a seller profile snapshot that does not exist in the system. The test ensures that the API correctly returns a 404 Not Found response for valid UUID formats that have no corresponding snapshot record.
 *
 * This edge case validation is critical for confirming that the snapshot retrieval endpoint properly distinguishes between invalid UUID formats (which would return 400) and valid UUIDs that simply don't exist in the database (which should return 404).
 *
 * 1. Administrator authenticates using the join operation to obtain valid credentials.
 * 2. A random valid UUID is generated that is guaranteed not to exist in the system.
 * 3. Administrator attempts to retrieve the snapshot using the non-existent UUID.
 * 4. TestValidator.httpError validates that the API returns 404 status code.
 */
export async function test_api_seller_profile_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a valid UUID that doesn't exist in the system
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to retrieve non-existent snapshot and validate 404 response
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.seller_profile_snapshots.at(
        adminConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
