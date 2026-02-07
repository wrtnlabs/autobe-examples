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

export async function test_api_system_config_read_all(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Retrieve system configs
  const result =
    await api.functional.community.admin.system_configs.index(adminConnection);
  typia.assert(result);
  // Validate pagination structure
  TestValidator.predicate(
    "current page is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array structure and content
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate("data array is not empty", result.data.length > 0);
  // Validate each config item matches ICommunitySystemConfig.ISummary
  result.data.forEach((config) => {
    // TestValidator.equals will validate exact structure
    TestValidator.equals("config item structure", config, {
      name: "",
      value: "",
      type: "",
      enabled: true,
    } satisfies ICommunitySystemConfig.ISummary);
  });
}
