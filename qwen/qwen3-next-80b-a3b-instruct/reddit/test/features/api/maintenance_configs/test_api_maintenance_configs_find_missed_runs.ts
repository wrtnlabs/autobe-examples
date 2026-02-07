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

export async function test_api_maintenance_configs_find_missed_runs(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Search for missed maintenance runs with properly structured query
  // Query: enabled = true AND last_run_at < 24 hours ago (includes null for never-run)
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const result = await api.functional.community.admin.maintenance_configs.index(
    adminConnection,
    {
      body: {
        enabled: true,
        last_run_at: {
          before: twentyFourHoursAgo,
        },
      } satisfies ICommunityMaintenanceConfig.IRequest,
    },
  );
  typia.assert(result);
  // Validate response structure - non-empty pagination and valid data array
  TestValidator.predicate(
    "pagination is valid",
    result.pagination.current > 0 && result.pagination.limit > 0,
  );
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate(
    "pagination records count matches data length",
    result.pagination.records === result.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    result.pagination.pages >= 0,
  );
  // Validate that the search worked by checking that data contains at least one config
  // This asserts the endpoint correctly searched for configs that haven't run in over 24 hours
  // Since we can't control pre-existing data, we validate the query structure and
  // response integrity instead of specific records
  TestValidator.predicate("at least one result found", result.data.length > 0);
}
