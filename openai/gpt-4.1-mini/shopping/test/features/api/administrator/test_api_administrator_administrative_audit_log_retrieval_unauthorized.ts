import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrative_audit_log_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Unauthorized access attempt to retrieve administrative audit log.
  // This test performs a request without authenticating as an administrator user,
  // expecting a HTTP 401 Unauthorized response.
  // This ensures only authorized administrators can access administrative audit logs.
  // We do NOT perform any administrator join or login.
  // Use the base connection directly to simulate unauthorized access
  // Generate a random UUID for the administrativeAuditLogId path parameter
  const administrativeAuditLogId = typia.random<string & tags.Format<"uuid">>();
  // Call the administrativeAuditLogs.at endpoint without authorization
  await TestValidator.httpError(
    "should receive 401 Unauthorized when accessing administrative audit log without auth",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administrativeAuditLogs.at(
        connection,
        { administrativeAuditLogId },
      );
    },
  );
}
