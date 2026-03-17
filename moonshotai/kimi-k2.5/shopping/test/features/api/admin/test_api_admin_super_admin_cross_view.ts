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
 * Test that a super administrator can retrieve details of another administrator account.
 * 1. Create a super admin account via /auth/superAdmin/join
 * 2. Create a regular admin account via /auth/admin/join to be viewed
 * 3. Use the super admin connection to call GET /admin/admins/{adminId}
 * 4. Verify the response includes the viewed admin's complete details
 */
export async function test_api_admin_super_admin_cross_view(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account
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
  // Create regular admin account to be viewed
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // Super admin retrieves regular admin details
  const viewedAdmin = await api.functional.ecommerceMall.admin.admins.at(
    superAdminConnection,
    {
      adminId: regularAdmin.id,
    },
  );
  typia.assert(viewedAdmin);
  // Validate the response contains complete details
  TestValidator.equals(
    "viewed admin id matches",
    viewedAdmin.id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "viewed admin email matches",
    viewedAdmin.email,
    regularAdmin.email,
  );
  TestValidator.equals(
    "viewed admin grade is regular",
    viewedAdmin.grade,
    "regular",
  );
  TestValidator.equals(
    "viewed admin status matches",
    viewedAdmin.status,
    regularAdmin.status,
  );
}
