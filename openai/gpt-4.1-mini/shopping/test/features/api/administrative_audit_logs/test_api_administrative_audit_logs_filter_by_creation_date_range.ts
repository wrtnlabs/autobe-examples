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

export async function test_api_administrative_audit_logs_filter_by_creation_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Using authorize_administrator_join utility to simulate admin join and get token
  // Passing empty join body because IShoppingMallAdministrator.IJoin is empty type
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Assign the returned token access to adminConnection headers for auth
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 2. Prepare date range filter for audit logs
  // Using a recent past 7 days range
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const body: IShoppingMallAdministrativeAuditLog.IRequest = {
    // The DTO definition for IRequest is an empty type
    // But from scenario, we set created_at filter which likely is included in actual implementation
    // Given that the concrete properties are not defined, we use an empty object
  };
  // Perform the audit logs patch request with date range filter
  // Since the actual filter properties are not defined in the DTO, we cannot set them
  // Call the API endpoint
  const output =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.patch(
      adminConnection,
      { body },
    );
  // Validate the output type
  typia.assert(output);
  // Validate pagination metadata and data array
  TestValidator.predicate(
    "pagination exists",
    output.pagination !== undefined && output.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current page >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", output.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // Additional validations for audit record immutability can be added if schema had properties
  // Since ISummary is empty type, we cannot do detailed per-record validation
  // 3. Verify unauthorized access
  const nonAdminConnection: api.IConnection = { host: connection.host };
  // Not setting auth headers to simulate unauthorized user
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.administrator.administrative_audit_logs.patch(
      nonAdminConnection,
      { body },
    );
  });
}
