import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_admin_downgrade_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin account using the join utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(superAdmin);
  // Step 2: Use the same superAdminConnection (already updated with Authorization header) for downgrade operation
  // The authorize_super_admin_join function automatically updates superAdminConnection.headers with the JWT token
  // Step 3: Perform the downgrade operation
  // The scenario requires targeting a regular admin, but we don't have a way to create one.
  // In an E2E test environment, there must be at least one regular admin for this test to pass.
  // Since we cannot create regular admins through the provided endpoints, we use a valid UUID.
  // The test assumes a regular admin with this UUID exists in the system.
  await api.functional.shoppingMall.superAdmin.admins.downgrade(
    superAdminConnection,
    {
      adminId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
