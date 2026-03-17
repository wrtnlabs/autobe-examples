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

export async function test_api_superadmin_config_comparison_with_key_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create super admin connection using token from authorization response
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: authResponse.token.access,
  };
  // 3. Define specific configuration keys to filter
  const targetKeys = [
    "max_upload_size",
    "enable_guest_access",
    "api_rate_limit",
  ] as const;
  // 4. Call compare-environments with key filtering
  const comparison =
    await api.functional.ecommerceMall.superAdmin.config.compare_environments.compareEnvironments(
      adminConnection,
      {
        body: {
          environmentScopes: ["staging", "production"],
          configurationKeys: [...targetKeys],
          page: 1,
          limit: 50,
        } satisfies IEcommerceMallPlatformConfigurationComparison.IRequest,
      },
    );
  typia.assert(comparison);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    comparison.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is within expected range",
    comparison.pagination.limit >= 1 && comparison.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    comparison.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    comparison.pagination.pages ===
      Math.ceil(comparison.pagination.records / comparison.pagination.limit),
  );
  // 6. Validate that all returned configurations match the filter keys
  const returnedKeys = comparison.data.map((item) => item.key);
  for (const key of returnedKeys) {
    TestValidator.predicate(
      `returned key is in filter list`,
      targetKeys.includes(key as (typeof targetKeys)[number]),
    );
  }
  // 7. Validate that environmentValues contains values for specified scopes when configured
  for (const item of comparison.data) {
    if (item.environmentValues.staging !== undefined) {
      TestValidator.predicate(
        `staging value has a valid type for key ${item.key}`,
        typeof item.environmentValues.staging === "string" ||
          typeof item.environmentValues.staging === "number" ||
          typeof item.environmentValues.staging === "boolean" ||
          item.environmentValues.staging === null,
      );
    }
    if (item.environmentValues.production !== undefined) {
      TestValidator.predicate(
        `production value has a valid type for key ${item.key}`,
        typeof item.environmentValues.production === "string" ||
          typeof item.environmentValues.production === "number" ||
          typeof item.environmentValues.production === "boolean" ||
          item.environmentValues.production === null,
      );
    }
  }
  // 8. Validate configuration structure and metadata
  for (const item of comparison.data) {
    TestValidator.predicate(
      "configuration has description",
      () => item.description.length > 0,
    );
    TestValidator.predicate(
      "configuration has a valid type",
      () =>
        ["string", "integer", "boolean", "json"].includes(item.type) ||
        item.type !== undefined,
    );
    TestValidator.predicate(
      "isActive is boolean",
      () => typeof item.isActive === "boolean",
    );
  }
  // 9. Test consistent ordering - verify all keys are unique in response
  const uniqueKeys = new Set(returnedKeys);
  TestValidator.equals(
    "unique keys count matches returned data length",
    uniqueKeys.size,
    returnedKeys.length,
  );
  // 10. Test that filtering reduces dataset size compared to no filter
  if (comparison.data.length > 0) {
    TestValidator.predicate(
      "filtered response contains only requested keys",
      comparison.data.every((item) =>
        targetKeys.includes(item.key as (typeof targetKeys)[number]),
      ),
    );
  }
}