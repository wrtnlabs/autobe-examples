import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallIntegrationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_integration_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate admin credentials for registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 2. Register new admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(authorized);
  // 3. Login as admin using the credentials from registration
  const loginResponse: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_login(adminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEcommerceMallAdmin.ILogin,
    });
  typia.assert(loginResponse);
  // 4. Retrieve integration log with valid logId
  const log: IEcommerceMallIntegrationLog =
    await api.functional.ecommerceMall.admin.integration_logs.at(
      adminConnection,
      {
        logId: "550e8400-e29b-41d4-a716-446655440000",
      },
    );
  typia.assert(log);
}
