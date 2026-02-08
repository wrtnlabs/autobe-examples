import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_inventory_audit_logs_filtered_by_reason_substring(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: The actual DTO definitions do not include any property for 'reason' filtering or 'reason' field
  // in the audit log summary. Thus, strict schema compliance prevents us from using reason filters or
  // accessing reason property. This test authenticates administrator, queries audit logs without filters,
  // and validates pagination metadata and returned data shape.
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Use updated connection headers automatically set by the authorize function
  // 2. Query all inventory audit logs with empty filter
  const auditLogs =
    await api.functional.shoppingMall.administrator.inventory.audit_logs.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(auditLogs);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is zero or positive",
    auditLogs.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    auditLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is zero or positive",
    auditLogs.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is zero or positive",
    auditLogs.pagination.records >= 0,
  );
  // 4. Ensure data is array
  TestValidator.predicate("data is array", Array.isArray(auditLogs.data));
  // Since ISummary has no properties, nothing else can be asserted.
}
