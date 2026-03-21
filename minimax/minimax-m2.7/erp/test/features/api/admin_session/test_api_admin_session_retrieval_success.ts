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

export async function test_api_admin_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and join new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  // 2. Create authenticated connection with the access token
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Generate a valid session UUID for testing
  // In real scenario, sessionId would come from login response or session list endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call GET /erpHrm/admin/admin-sessions/{sessionId}
  const session = await api.functional.erpHrm.admin.admin_sessions.at(
    sessionConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate response contains all expected session fields
  TestValidator.equals("session id matches request", session.id, sessionId);
  TestValidator.predicate(
    "has admin reference",
    session.admin !== null && session.admin !== undefined,
  );
  TestValidator.equals(
    "admin email matches creator",
    session.admin.email,
    authorized.email,
  );
  TestValidator.equals(
    "admin display_name matches creator",
    session.admin.display_name,
    authorized.display_name,
  );
  TestValidator.predicate(
    "has valid ip",
    session.ip !== null && session.ip !== undefined,
  );
  TestValidator.predicate(
    "has valid href",
    session.href !== null && session.href !== undefined,
  );
  TestValidator.predicate(
    "has valid referrer",
    session.referrer !== null && session.referrer !== undefined,
  );
  TestValidator.predicate(
    "has valid created_at",
    session.created_at !== null && session.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid expired_at",
    session.expired_at !== null && session.expired_at !== undefined,
  );
}
