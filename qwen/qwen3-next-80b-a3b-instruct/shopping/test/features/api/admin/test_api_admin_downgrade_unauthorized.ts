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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_admin_downgrade_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection and authenticate as superAdmin
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  (superAdminConnection.headers as Record<string, string>).Authorization =
    superAdmin.token.access;
  // Step 2: Create a connection and authenticate as regular admin
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join", // Added required href
        referrer: "https://example.com", // Added required referrer
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  (adminConnection.headers as Record<string, string>).Authorization =
    admin.token.access;
  // Step 3: Test downgrade attempt by regular admin (should fail with 403)
  await TestValidator.error(
    "regular admin cannot downgrade another admin",
    async () => {
      await api.functional.shoppingMall.superAdmin.admins.downgrade(
        adminConnection, // Using admin connection, not superAdmin
        {
          adminId: admin.id,
        },
      );
    },
  );
  // Step 4: Test downgrade attempt by unauthenticated user (should fail with 401)
  await TestValidator.error(
    "unauthenticated user cannot downgrade admin",
    async () => {
      // Create unauthenticated connection
      const unauthenticatedConnection: api.IConnection = {
        host: connection.host,
        headers: {},
      };
      await api.functional.shoppingMall.superAdmin.admins.downgrade(
        unauthenticatedConnection,
        {
          adminId: admin.id,
        },
      );
    },
  );
}
