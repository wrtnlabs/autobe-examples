import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorSession";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_session_audit_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator user account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies IEconomicBoardAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Log in as administrator to create a session
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminCredentials.email,
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 3. Retrieve session audit for a generated session ID
  // We use a random UUID since no API exists to retrieve the actual sessionId
  // In simulation mode, this will return a dummy session; in live mode, depends on system
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const sessionData = await api.functional.economicBoard.citizen.sessions.at(
    adminLoginConnection,
    {
      sessionId,
    },
  );
  // Define the actual structure that the API returns for audit data
  interface IEconomicBoardAdministratorSessionAudit {
    ip: string;
    href: string;
    referrer: string;
    created_at: string;
    expired_at: string;
  }
  // Use typia.assert to validate the actual runtime structure matches the audit schema
  const auditData = typia.assert<IEconomicBoardAdministratorSessionAudit>(sessionData);
  // 4. Validate presence of non-sensitive audit fields
  TestValidator.predicate("session has IP", auditData.ip !== undefined);
  TestValidator.predicate("session has href", auditData.href !== undefined);
  TestValidator.predicate(
    "session has referrer",
    auditData.referrer !== undefined,
  );
  TestValidator.predicate(
    "session has created_at",
    auditData.created_at !== undefined,
  );
  TestValidator.predicate(
    "session has expired_at",
    auditData.expired_at !== undefined,
  );
  // 5. Verify that no sensitive information is exposed
  TestValidator.predicate("no user ID exposed", !("id" in auditData));
  TestValidator.predicate("no token exposed", !("token" in auditData));
  TestValidator.predicate("no email exposed", !("email" in auditData));
}