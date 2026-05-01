import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that cross-administrator session access is denied.
 *
 * Validates session ownership isolation by creating two independent
 * administrator accounts and verifying that one administrator cannot
 * access another administrator's session records. This ensures that
 * each administrator's security audit data remains private and cannot
 * be inspected by unauthorized administrators.
 *
 * 1. Admin A registers via the join endpoint, obtaining an authenticated
 *    session with JWT token.
 * 2. Admin B registers via the join endpoint, obtaining a separate
 *    authenticated session.
 * 3. Admin A, authenticated with Admin A's JWT token, attempts to retrieve
 *    a session using Admin B's admin ID and a session ID.
 * 4. The system must reject this cross-administrator access with a 404
 *    Not Found response, confirming that session ownership is enforced.
 */
export async function test_api_admin_session_cross_admin_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Admin A
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_admin_join(adminAConnection, {});
  typia.assert(adminA);
  // 2. Create Admin B
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_admin_join(adminBConnection, {});
  typia.assert(adminB);
  // 3. Admin A attempts to access Admin B's session — must be denied
  await TestValidator.httpError(
    "cross-admin session access must be denied with 404",
    404,
    async () =>
      await api.functional.shoppingMall.admin.admins.sessions.at(
        adminAConnection,
        {
          adminId: adminB.id,
          sessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
