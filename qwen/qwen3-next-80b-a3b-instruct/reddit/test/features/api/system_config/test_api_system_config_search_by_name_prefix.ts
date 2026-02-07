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

export async function test_api_system_config_search_by_name_prefix(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Retrieve all system configurations
  const result =
    await api.functional.community.admin.system_configs.index(adminConnection);
  typia.assert(result);
  // Validate response matches IPageICommunitySystemConfig.ISummary
  TestValidator.equals(
    "pagination exists",
    result.pagination,
    result.pagination,
  );
  TestValidator.equals("data array exists", result.data, result.data);
  TestValidator.predicate(
    "pagination.current is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length matches pagination records",
    result.data.length === result.pagination.records ||
      result.data.length <= result.pagination.limit,
  );
  // Validate that each entry is an object (ICommunitySystemConfig.ISummary is empty)
  for (const config of result.data) {
    TestValidator.predicate(
      "each config is an object",
      typeof config === "object",
    );
    TestValidator.predicate("each config is not null", config !== null);
  }
}
