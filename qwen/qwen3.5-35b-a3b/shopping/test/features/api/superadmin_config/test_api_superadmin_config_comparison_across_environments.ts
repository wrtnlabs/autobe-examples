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

export async function test_api_superadmin_config_comparison_across_environments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Admin Authentication - Create new super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a new connection with admin credentials for API calls
  const adminApiConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Invoke compare-environments endpoint with staging and production environments
  const comparisonResult =
    await api.functional.ecommerceMall.superAdmin.config.compare_environments.compareEnvironments(
      adminApiConnection,
      {
        body: {
          environmentScopes: ["staging", "production"],
        } satisfies IEcommerceMallPlatformConfigurationComparison.IRequest,
      },
    );
  typia.assert(comparisonResult);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination records count is non-negative",
    comparisonResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    comparisonResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    comparisonResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page is non-negative",
    comparisonResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "total pages is calculated correctly from records and limit",
    comparisonResult.pagination.records === 0
      ? comparisonResult.pagination.pages === 0
      : Math.ceil(
          comparisonResult.pagination.records /
            comparisonResult.pagination.limit,
        ) === comparisonResult.pagination.pages,
  );
  TestValidator.predicate(
    "data array length matches pagination records",
    comparisonResult.data.length <= comparisonResult.pagination.records,
  );
  // 5. Validate each configuration entry in the response
  for (const config of comparisonResult.data) {
    // Validate individual config entry structure
    typia.assert(config);
    // Validate id exists and is UUID format
    TestValidator.predicate(
      "configuration id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.id,
      ),
    );
    // Validate key is non-empty string
    TestValidator.predicate(
      "configuration key is non-empty string",
      config.key.length > 0,
    );
    // Validate description is non-empty string
    TestValidator.predicate(
      "configuration description is non-empty string",
      config.description.length > 0,
    );
    // Validate type is non-empty string
    TestValidator.predicate(
      "configuration type is non-empty string",
      config.type.length > 0,
    );
    // Validate isActive is boolean
    TestValidator.predicate(
      "isActive is boolean",
      typeof config.isActive === "boolean",
    );
    // Validate environmentValues object exists
    TestValidator.predicate(
      "environmentValues is non-null object",
      config.environmentValues !== null &&
        config.environmentValues !== undefined,
    );
    TestValidator.equals(
      "environmentValues is object type",
      typeof config.environmentValues,
      "object",
    );
    // Validate staging environment value key exists
    TestValidator.predicate(
      "environmentValues has staging scope key",
      "staging" in config.environmentValues,
    );
    // Validate production environment value key exists
    TestValidator.predicate(
      "environmentValues has production scope key",
      "production" in config.environmentValues,
    );
    // Validate staging environment value type
    const stagingValue = config.environmentValues.staging;
    TestValidator.predicate(
      "staging environment value is valid type",
      typeof stagingValue === "string" ||
        typeof stagingValue === "number" ||
        typeof stagingValue === "boolean" ||
        stagingValue === null,
    );
    // Validate production environment value type
    const productionValue = config.environmentValues.production;
    TestValidator.predicate(
      "production environment value is valid type",
      typeof productionValue === "string" ||
        typeof productionValue === "number" ||
        typeof productionValue === "boolean" ||
        productionValue === null,
    );
    // Validate created_at is ISO 8601 date-time format
    TestValidator.predicate(
      "created_at is valid ISO 8601 date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        config.created_at,
      ),
    );
    // Validate updated_at is ISO 8601 date-time format
    TestValidator.predicate(
      "updated_at is valid ISO 8601 date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        config.updated_at,
      ),
    );
    // Validate deleted_at is either null or ISO 8601 date-time format
    TestValidator.predicate(
      "deleted_at is valid nullable date-time",
      config.deleted_at === null ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
          config.deleted_at,
        ),
    );
  }
  // 6. Verify that at least some configurations show differences between environments
  // (optional validation for meaningful comparison)
  if (comparisonResult.data.length > 0) {
    const hasEnvironmentDifference = comparisonResult.data.some(
      (config) =>
        config.environmentValues.staging !==
        config.environmentValues.production,
    );
    // Note: Not asserting this as configs may be identical across environments
  }
}
