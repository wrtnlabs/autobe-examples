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

export async function test_api_superadmin_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection by joining
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a UUID that does not correspond to any existing session
  const nonExistentSessionId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  // 3. Call the endpoint with non-existent session ID and verify 404 error
  await TestValidator.httpError(
    "session not found returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.sessions.at(
        superAdminConnection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
