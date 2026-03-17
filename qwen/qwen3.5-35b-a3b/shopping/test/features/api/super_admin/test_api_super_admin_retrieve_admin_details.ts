import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator can retrieve admin account details.
 * 1. Create a super admin account
 * 2. Use the super admin to retrieve admin details
 * 3. Validate security requirements (no password_hash) and business logic (deleted_at)
 */
export async function test_api_super_admin_retrieve_admin_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Retrieve admin details (using super admin's own ID for testing)
  const adminDetails = await api.functional.ecommerceMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId: superAdminAuth.id,
    },
  );
  typia.assert(adminDetails);
  // 3. Validate security requirements
  const responseKeys = Object.keys(adminDetails);
  TestValidator.predicate(
    "password_hash not included in response",
    !responseKeys.includes("password_hash"),
  );
  // 4. Validate business logic: deleted_at is null for active admin
  TestValidator.equals(
    "deleted_at is null for active admin",
    adminDetails.deleted_at,
    null,
  );
}
