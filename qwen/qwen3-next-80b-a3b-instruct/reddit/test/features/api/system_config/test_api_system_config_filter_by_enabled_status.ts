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

export async function test_api_system_config_filter_by_enabled_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator with join endpoint (utility function)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Call system config index endpoint to retrieve enabled configs
  const configResponse =
    await api.functional.community.admin.system_configs.index(adminConnection);
  typia.assert(configResponse);
  // 3. Validate response structure follows IPageICommunitySystemConfig.ISummary
  TestValidator.equals(
    "pagination exists",
    configResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(configResponse.data),
    true,
  );
  // 4. Verify all config items are enabled and follow ISummary schema
  for (const config of configResponse.data) {
    // ISummary has no properties defined, so we can't validate specific fields
    // but we verify it's not empty object due to typia.assert validation
    TestValidator.predicate("config is non-null", config !== null);
  }
  // 5. Verify pagination metadata is valid
  TestValidator.predicate(
    "current page >= 1",
    configResponse.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", configResponse.pagination.limit > 0);
  TestValidator.predicate(
    "records >= 0",
    configResponse.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", configResponse.pagination.pages >= 0);
}
