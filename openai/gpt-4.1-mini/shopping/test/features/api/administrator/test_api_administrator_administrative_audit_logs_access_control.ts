import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrative_audit_logs_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Verify that the administrative audit logs endpoint enforces strict access control.
  // 1. Attempt to access the audit logs without logging in, expect an authorization error.
  // 2. Optionally try an insufficient privilege user if possible (not specified here, so skipped).
  // 3. Register a new administrator user and authenticate.
  // 4. Access the audit logs endpoint successfully with the authorized admin connection.
  // 1. Without any authentication
  await TestValidator.httpError(
    "unauthenticated access denied",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administrative_audit_logs.get(
        connection,
      );
    },
  );
  // 2. Register a new administrator and login
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin join body
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  // Update adminConnection headers with access token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Access the audit logs endpoint with admin authorization
  const output =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.get(
      adminConnection,
    );
  typia.assert(output);
  // Validate that the pagination metadata and data array are present and consistent
  TestValidator.predicate("pagination exists", output.pagination !== undefined);
  TestValidator.predicate("data is array", Array.isArray(output.data));
}
