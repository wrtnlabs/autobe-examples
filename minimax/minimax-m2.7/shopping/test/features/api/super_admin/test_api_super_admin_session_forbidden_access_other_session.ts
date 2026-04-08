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

export async function test_api_super_admin_session_forbidden_access_other_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator A
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminAConnection, {});
  typia.assert(superAdminA);
  // 2. Register and authenticate as super administrator B (different session)
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminB: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminBConnection, {});
  typia.assert(superAdminB);
  // 3. For this test, we use a random UUID as B's potential session ID
  // The 403 error should be returned regardless of whether the session exists
  // because ownership check happens before existence check
  const fakeSessionIdForB = typia.random<string & tags.Format<"uuid">>();
  // 4. As super administrator A, attempt to retrieve super administrator B's session
  // This should return 403 Forbidden since A is not the owner of B's session
  await TestValidator.httpError(
    "super admin A cannot access super admin B's session",
    403,
    async () =>
      await api.functional.ecommerceMall.superAdmin.super_admin.sessions.at(
        superAdminAConnection,
        {
          sessionId: fakeSessionIdForB,
        },
      ),
  );
}
