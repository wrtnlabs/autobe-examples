import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMaintenanceConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMaintenanceConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_maintenance_configs_search_enabled_data_archiving_recent(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Prepare search request with enabled=true and task_type='data_archiving'
  const searchRequest: ICommunityMaintenanceConfig.IRequest = {
    enabled: true,
    task_type: "data_archiving",
  };
  // Execute search request
  const result = await api.functional.community.admin.maintenance_configs.index(
    adminConnection,
    {
      body: searchRequest,
    },
  );
  typia.assert(result);
  // Validate response structure - verify pagination object exists
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  // Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
  // Validate pagination metadata - all values should be positive integers
  TestValidator.predicate(
    "current page positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate("limit positive", result.pagination.limit > 0);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // Since ICommunityMaintenanceConfig.ISummary is defined as an empty object {},
  // we cannot validate any properties on the data items. This is a limitation of
  // the provided DTO definition. The test focuses on structure validation only.
  // Verify that if no matching configs exist, we get empty data array with pagination
  if (result.data.length === 0) {
    TestValidator.equals("zero records", result.pagination.records, 0);
    TestValidator.equals("zero pages", result.pagination.pages, 0);
  }
}
