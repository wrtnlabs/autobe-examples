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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the primary success path where a super administrator retrieves detailed information about an existing regular administrator account.
 * This verifies that the super admin has proper access privileges to view any administrator's profile data including email, grade (regular), status (active/suspended/banned), nickname, and audit timestamps.
 */
export async function test_api_admin_view_regular_admin_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Super admin retrieves regular admin details
  const adminDetails = await api.functional.ecommerceMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId: regularAdmin.id,
    },
  );
  typia.assert(adminDetails);
  // 4. Validate response fields match expected values
  TestValidator.equals("admin ID matches", adminDetails.id, regularAdmin.id);
  TestValidator.equals(
    "admin email matches",
    adminDetails.email,
    regularAdmin.email,
  );
  TestValidator.equals("admin grade is regular", adminDetails.grade, "regular");
  TestValidator.equals(
    "admin status matches",
    adminDetails.status,
    regularAdmin.status,
  );
  TestValidator.equals(
    "admin nickname matches",
    adminDetails.nickname,
    regularAdmin.nickname,
  );
}
