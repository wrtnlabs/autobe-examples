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

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can successfully view their own administrator record.
 * 1. Register as super admin via join endpoint
 * 2. Retrieve own admin profile using the admin ID from registration
 * 3. Verify the profile shows correct grade, status, and identity fields
 */
export async function test_api_admin_view_own_profile_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // View own profile
  const profile = await api.functional.ecommerceMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId: superAdmin.id,
    },
  );
  typia.assert(profile);
  // Validate business rules
  TestValidator.equals("grade is super_admin", profile.grade, "super_admin");
  TestValidator.equals("status is active", profile.status, "active");
  TestValidator.equals("email matches", profile.email, superAdmin.email);
  TestValidator.equals("id matches", profile.id, superAdmin.id);
}
