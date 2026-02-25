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

export async function test_api_admin_request_approval_unauthorized_actor(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      } satisfies IEconomicBoardSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create administrator account (not super admin)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  typia.assert(admin);
  // Log in as administrator (unauthorized actor)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(unauthorizedConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // Retrieve a pending admin request (simulated UUID since actual request creation is not provided)
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // Attempt approval as unauthorized administrator
  await TestValidator.httpError(
    "should return 403 when non-super-administrator attempts to approve admin request",
    403,
    async () => {
      await api.functional.economicBoard.superAdministrator.admin.admin_requests.approve(
        unauthorizedConnection,
        { requestId },
      );
    },
  );
}
