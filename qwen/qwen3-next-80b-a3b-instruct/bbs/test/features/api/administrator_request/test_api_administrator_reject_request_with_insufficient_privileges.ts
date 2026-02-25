import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_reject_request_with_insufficient_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    { body: superAdminCredentials },
  );
  // 2. Create regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  // 3. Authenticate as regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(regularAdminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 4. Create administrator request
  const requestReason = RandomGenerator.paragraph({ sentences: 2 });
  const auditLog: IEconomicBoardAdministratorAuditLog = {
    id: typia.random<string & tags.Format<"uuid">>(),
    actor_id: superAdmin.id,
    action_type: "approve_admin_request",
    target_id: admin.id,
    reason: requestReason,
    ip_address: "127.0.0.1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actor: {
      id: superAdmin.id,
      email: superAdminCredentials.email,
      display_name: null,
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    target: {
      id: admin.id,
      display_name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      article_count: 0,
      comment_count: 0,
    },
  };
  await api.functional.economicBoard.superAdministrator.requests.create(
    connection,
    {
      body: auditLog,
    },
  );
  // 5. Attempt to reject request as regular administrator (should fail with 403)
  await TestValidator.httpError(
    "regular administrator should be denied rejection of admin request",
    403,
    async () => {
      await api.functional.economicBoard.superAdministrator.requests.reject(
        regularAdminConnection,
        {
          requestId: admin.id, // Use admin.id as the request ID since that's the target
        },
      );
    },
  );
}