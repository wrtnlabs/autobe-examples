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

export async function test_api_maintenance_configs_filter_by_notification_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Authenticate to have permission to access maintenance configurations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Filter maintenance configs by notification_email containing '@company.com'
  // Use the IRequest type for filtering; this is the only available operation
  const filterBody: ICommunityMaintenanceConfig.IRequest = {
    notification_email: "@company.com",
  } satisfies ICommunityMaintenanceConfig.IRequest;
  const filteredResult =
    await api.functional.community.admin.maintenance_configs.index(
      adminConnection,
      {
        body: filterBody,
      },
    );
  typia.assert(filteredResult);
  // 3. Validate pagination structure
  TestValidator.equals(
    "current page is 1",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    filteredResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    filteredResult.pagination.pages >= 0,
  );
  // 4. Validate that the response contains at least one config (otherwise test is meaningless)
  TestValidator.predicate(
    "at least one matching config returned",
    filteredResult.data.length > 0,
  );
}
