import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin account via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Login with the admin credentials to establish authentication context
  const authorizedConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 3. Call GET /erpHrm/admin/admin-sessions/{sessionId} with a random UUID that does not exist
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4-5. Validate response status is 404 Not Found
  await TestValidator.httpError(
    "session not found returns 404",
    404,
    async () => {
      await api.functional.erpHrm.admin.admin_sessions.at(
        authorizedConnection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
