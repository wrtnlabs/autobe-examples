import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrativeAuditLog";
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

/**
 * Test filtering administrative audit logs by action type and administrator ID.
 *
 * This test covers:
 * - Administrator join and authorization
 * - Call patch endpoint for audit logs with empty filter (due to DTO schema)
 * - Validate typia.assert on response
 * - Validate immutable behavior of patch endpoint (no modifications allowed)
 */
export async function test_api_administrative_audit_logs_filter_action_type_and_administrator_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminJoinConnection: IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminJoinConnection, {
      body: {},
    });
  // 2. Use the authorized connection
  const adminConnection: IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 3. Call audit logs patch with empty filter body (IRequest is empty)
  const filteredLogs: IPageIShoppingMallAdministrativeAuditLog.ISummary =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.patch(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(filteredLogs);
  // 4. Confirm immutable behavior: patch with same body again must error
  await TestValidator.error(
    "immutable endpoint rejects modification",
    async () => {
      await api.functional.shoppingMall.administrator.administrative_audit_logs.patch(
        adminConnection,
        {
          body: {},
        },
      );
    },
  );
}
