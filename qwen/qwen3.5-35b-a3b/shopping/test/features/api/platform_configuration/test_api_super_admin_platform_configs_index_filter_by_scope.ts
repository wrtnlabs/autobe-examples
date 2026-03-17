import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallPlatformConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_platform_configs_index_filter_by_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Test with scope='staging'
  const stagingFilter: IEcommerceMallPlatformConfiguration.IRequest = {
    scope: "staging",
  } satisfies IEcommerceMallPlatformConfiguration.IRequest;
  const stagingResponse =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.index(
      adminConnection,
      {
        body: stagingFilter,
      },
    );
  typia.assert(stagingResponse);
  // 3. Validate all returned configurations have scope='staging'
  TestValidator.predicate("all staging configs should have scope=staging", () =>
    stagingResponse.data.every((config) => config.scope === "staging"),
  );
  // 4. Validate pagination metadata (records >= data length)
  TestValidator.equals(
    "pagination records count >= data length (staging)",
    stagingResponse.pagination.records,
    stagingResponse.data.length,
  );
  // 5. Test with scope='production'
  const productionFilter: IEcommerceMallPlatformConfiguration.IRequest = {
    scope: "production",
  } satisfies IEcommerceMallPlatformConfiguration.IRequest;
  const productionResponse =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.index(
      adminConnection,
      {
        body: productionFilter,
      },
    );
  typia.assert(productionResponse);
  // 6. Validate all returned configurations have scope='production'
  TestValidator.predicate(
    "all production configs should have scope=production",
    () =>
      productionResponse.data.every((config) => config.scope === "production"),
  );
  // 7. Validate pagination metadata for production
  TestValidator.equals(
    "pagination records count >= data length (production)",
    productionResponse.pagination.records,
    productionResponse.data.length,
  );
  // 8. Verify staging and production are different sets
  const stagingIds = new Set(stagingResponse.data.map((c) => c.id));
  const productionIds = new Set(productionResponse.data.map((c) => c.id));
  const hasOverlap = stagingResponse.data.some((config) =>
    productionIds.has(config.id),
  );
  TestValidator.equals(
    "staging and production should not overlap",
    hasOverlap,
    false,
  );
}
