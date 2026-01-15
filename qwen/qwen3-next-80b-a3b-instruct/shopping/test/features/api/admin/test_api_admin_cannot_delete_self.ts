import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_cannot_delete_self(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account using the authorization utility function
  // This simulates a system administrator registering for access
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Attempt to delete the admin account using the same admin's connection (self-deletion attempt)
  // This is a critical security test - an admin should NEVER be able to delete their own account
  // The system must return a 403 Forbidden error when an admin tries to delete themselves
  // This protects against accidental or malicious loss of system access
  await TestValidator.httpError(
    "admin cannot delete themselves - must return 403 Forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(adminConnection, {
        adminId: admin.id,
      });
    },
  );
}
