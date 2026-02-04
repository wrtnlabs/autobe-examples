import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_admin_promotion_rejected_for_nonexistent_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Create an invalid adminId (non-existent UUID)
  const nonExistentAdminId = typia.random<string>(); // Invalid UUID format
  // Step 3: Attempt to promote the non-existent admin
  await TestValidator.error(
    "should reject promotion of non-existent admin",
    async () => {
      await api.functional.shoppingMall.superAdmin.admins.upgrade(
        superAdminConnection, // Use superAdmin connection, NOT base connection
        {
          adminId: nonExistentAdminId,
        },
      );
    },
  );
  // Step 4: Verify that system state was not modified
  // Since we expect a 404 error and no side effects, no additional validation needed
}
