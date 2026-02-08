import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrative_audit_log_retrieve(
  connection: api.IConnection,
): Promise<void> {
  /*
      Scenario 1: Authorized administrator retrieves an existing audit log by ID.
      Scenario 2: Unauthorized user (no admin authorization) tries to retrieve audit log and is rejected.
      Scenario 3: Authorized administrator tries to retrieve audit log with non-existent ID and gets not found error.
    */
  // 1. Admin join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  // The IJoin body is empty object as per DTO
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  // 2. Scenario 1: Retrieve existing audit log
  // Create a random UUID for logId to simulate realistic call
  const validLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.at(
      adminConnection,
      {
        logId: validLogId,
      },
    );
  typia.assert(auditLog);
  // Validate important fields in auditLog if they exist
  // Since structure is empty object, just typia.assert is enough for runtime shape
  // Additional business validation can be done if DTO had real fields
  // 3. Scenario 2: Unauthorized access attempt
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to audit log",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administrative_audit_logs.at(
        unauthorizedConnection,
        {
          logId: validLogId,
        },
      );
    },
  );
  // 4. Scenario 3: Retrieve non-existent audit log
  const nonExistentLogId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  await TestValidator.httpError(
    "not found audit log retrieval",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrative_audit_logs.at(
        adminConnection,
        {
          logId: nonExistentLogId,
        },
      );
    },
  );
}
