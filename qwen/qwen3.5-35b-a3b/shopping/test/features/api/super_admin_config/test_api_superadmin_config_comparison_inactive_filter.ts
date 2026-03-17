import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfigurationComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfigurationComparison";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallPlatformConfigurationComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallPlatformConfigurationComparison";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_config_comparison_inactive_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(authResponse);
  // 2. Test with isActive=false (only inactive configurations)
  const inactiveFilter: IEcommerceMallPlatformConfigurationComparison.IRequest =
    {
      environmentScopes: ["production"],
      isActive: false,
    } satisfies IEcommerceMallPlatformConfigurationComparison.IRequest;
  const inactiveResult =
    await api.functional.ecommerceMall.superAdmin.config.compare_environments.compareEnvironments(
      adminConnection,
      {
        body: inactiveFilter,
      },
    );
  typia.assert(inactiveResult);
  // Validate that all returned configurations are inactive
  for (const config of inactiveResult.data) {
    TestValidator.equals("config should be inactive", config.isActive, false);
  }
  // Validate pagination reflects only filtered records
  TestValidator.predicate(
    "inactive filter pagination is valid",
    inactiveResult.pagination.records === inactiveResult.data.length,
  );
  // 3. Test with isActive=true (only active configurations)
  const activeFilter: IEcommerceMallPlatformConfigurationComparison.IRequest = {
    environmentScopes: ["production"],
    isActive: true,
  } satisfies IEcommerceMallPlatformConfigurationComparison.IRequest;
  const activeResult =
    await api.functional.ecommerceMall.superAdmin.config.compare_environments.compareEnvironments(
      adminConnection,
      {
        body: activeFilter,
      },
    );
  typia.assert(activeResult);
  // Validate that all returned configurations are active
  for (const config of activeResult.data) {
    TestValidator.equals("config should be active", config.isActive, true);
  }
  // Validate pagination reflects only filtered records
  TestValidator.predicate(
    "active filter pagination is valid",
    activeResult.pagination.records === activeResult.data.length,
  );
  // 4. Test with isActive undefined (all configurations)
  const allFilter: IEcommerceMallPlatformConfigurationComparison.IRequest = {
    environmentScopes: ["production"],
  } satisfies IEcommerceMallPlatformConfigurationComparison.IRequest;
  const allResult =
    await api.functional.ecommerceMall.superAdmin.config.compare_environments.compareEnvironments(
      adminConnection,
      {
        body: allFilter,
      },
    );
  typia.assert(allResult);
  // Validate pagination is valid for all records
  TestValidator.predicate(
    "all records pagination is valid",
    allResult.pagination.records === allResult.data.length,
  );
  // 5. Verify environmentValues structure
  for (const config of allResult.data) {
    TestValidator.predicate(
      "environmentValues is an object",
      typeof config.environmentValues === "object",
    );
  }
  // 6. Test pagination parameters
  const paginatedFilter: IEcommerceMallPlatformConfigurationComparison.IRequest =
    {
      environmentScopes: ["production"],
      isActive: false,
      page: 1,
      limit: 10,
    } satisfies IEcommerceMallPlatformConfigurationComparison.IRequest;
  const paginatedResult =
    await api.functional.ecommerceMall.superAdmin.config.compare_environments.compareEnvironments(
      adminConnection,
      {
        body: paginatedFilter,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", paginatedResult.pagination.limit, 10);
}
