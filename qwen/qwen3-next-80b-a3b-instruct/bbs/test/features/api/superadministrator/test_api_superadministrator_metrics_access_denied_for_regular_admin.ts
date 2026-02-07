import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_superadministrator_metrics_access_denied_for_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdministrator account with generated email
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.economicBoard.auth.superAdministrator.join(
    superAdminConnection,
    {
      body: {} satisfies IEconomicBoardSuperAdministrator.IJoin,
    },
  );
  // 2. Log in as superAdministrator using the generated email
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdminEmail,
    } satisfies IEconomicBoardSuperAdministrator.ILogin,
  });
  // 3. Create regular administrator account with generated email
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 4. Log in as regular administrator using the generated email
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 5. Attempt to access superAdministrator metrics endpoint with regular admin connection
  await TestValidator.httpError(
    "regular admin should be denied access to superAdministrator metrics",
    403,
    async () => {
      await api.functional.economicBoard.superAdministrator.metrics.index(
        adminLoginConnection,
      );
    },
  );
}
