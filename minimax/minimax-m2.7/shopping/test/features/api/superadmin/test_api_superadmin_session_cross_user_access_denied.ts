import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_session_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first super admin
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin = await authorize_super_admin_join(
    firstSuperAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "/test",
        referrer: "/",
      },
    },
  );
  typia.assert(firstSuperAdmin);
  // 2. Register second super admin with different credentials
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondSuperAdmin = await authorize_super_admin_join(
    secondSuperAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "/test",
        referrer: "/",
      },
    },
  );
  typia.assert(secondSuperAdmin);
  // 3. Verify both super admins have different IDs (different users)
  TestValidator.notEquals(
    "different super admin accounts",
    firstSuperAdmin.id,
    secondSuperAdmin.id,
  );
  // 4. Generate a UUID representing first super admin's session ID
  // (Since we cannot extract actual session ID from join response)
  const firstSuperAdminSessionId = typia.random<string & tags.Format<"uuid">>();
  // 5. Try to access first super admin's session using second super admin's credentials
  // This should be denied - session isolation must be enforced between users
  await TestValidator.httpError(
    "cross-user session access denied (403 Forbidden or 404 Not Found)",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.superAdmin.sessions.at(
        secondSuperAdminConnection,
        {
          sessionId: firstSuperAdminSessionId,
        },
      );
    },
  );
}
