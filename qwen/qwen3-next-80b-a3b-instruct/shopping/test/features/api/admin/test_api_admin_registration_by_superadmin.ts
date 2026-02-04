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
export async function test_api_admin_registration_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the superAdmin actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate unique credentials for the super admin
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Create superAdmin account using authorize_super_admin_join
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    },
  });
  typia.assert(superAdmin);
  // Step 2: Authenticate as superAdmin to obtain valid session
  const authenticatedSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_admin_login(authenticatedSuperAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    },
  });
  // Generate unique credentials for the new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Step 3: Create new admin account as superAdmin using authorize_admin_join
  const newAdmin = await authorize_admin_join(
    authenticatedSuperAdminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      },
    },
  );
  typia.assert(newAdmin);
  // Verify that admin account was created with correct properties
  TestValidator.equals("admin email matches", newAdmin.email, adminEmail);
  TestValidator.equals("admin has regular role", newAdmin.adminType, "regular");
  TestValidator.predicate("admin has tokens", newAdmin.token !== undefined);
  // Verify admin can authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authenticatedAdmin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(authenticatedAdmin);
  TestValidator.equals(
    "authenticated admin email matches",
    authenticatedAdmin.email,
    adminEmail,
  );
}
