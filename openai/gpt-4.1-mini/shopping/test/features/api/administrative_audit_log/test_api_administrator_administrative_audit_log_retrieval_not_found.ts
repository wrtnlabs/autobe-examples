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

export async function test_api_administrator_administrative_audit_log_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt retrieval with a non-existent administrative audit log UUID.
  // The test authenticates as an administrator by joining first,
  // then requests an administrative audit log ID that does not exist.
  // The expected response is HTTP 404 Not Found, verifying the system correctly
  // handles requests for missing audit log entries and returns appropriate error status.
  // 1. Administrator join (sign up) to get authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123",
    },
  });
  typia.assert(adminAuthorized);
  // Update adminConnection headers with authentication token
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Attempt to retrieve administrative audit log with non-existent UUID
  // Use a randomly generated UUID that is very unlikely to exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the administrative audit log retrieval API with non-existent ID
  // Expect an HTTP 404 error to be thrown
  await TestValidator.httpError(
    "retrieval with non-existent audit log UUID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrativeAuditLogs.at(
        adminConnection,
        {
          administrativeAuditLogId: nonExistentId,
        },
      );
    },
  );
}
