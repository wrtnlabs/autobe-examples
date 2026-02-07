import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_audit_logs_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin: ICommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {} satisfies ICommunityAdmin.IJoin,
    },
  );
  // 2. Query system configuration audit logs with empty filter (per schema definition)
  // Note: ICommunitySystemConfig.IRequest is defined as {} - no date filtering possible
  // We must follow the schema definition exactly, even if the scenario expects filtering
  const auditLogs =
    await api.functional.community.admin.audit.system_configs.index(
      adminConnection,
      {
        body: {} satisfies ICommunitySystemConfig.IRequest,
      },
    );
  typia.assert(auditLogs);
  // 3. Validate response structure: pagination and data arrays
  TestValidator.equals(
    "pagination exists",
    auditLogs.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", auditLogs.data !== undefined, true);
  TestValidator.predicate(
    "pagination has correct current page",
    () => auditLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    () => auditLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    () => auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    () => auditLogs.pagination.pages >= 0,
  );
  // 4. Validate that audit logs have expected structure
  // ICommunitySystemConfig.ISummary is defined as {} - no properties to validate
  // We can test that the array has at least one entry
  TestValidator.predicate(
    "at least one audit log exists",
    () => auditLogs.data.length > 0,
  );
}
