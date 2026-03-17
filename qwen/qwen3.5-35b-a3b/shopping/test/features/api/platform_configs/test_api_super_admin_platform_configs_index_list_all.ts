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

export async function test_api_super_admin_platform_configs_index_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create connection for API calls with authentication token
  const platformConfigConnection: api.IConnection = { host: connection.host };
  platformConfigConnection.headers = {
    Authorization: authResponse.token.access,
  };
  // 3. Call index endpoint with no filters to fetch all active configurations
  const response =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.index(
      platformConfigConnection,
      {
        body: {} satisfies IEcommerceMallPlatformConfiguration.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.equals("current page should be 1", pagination.current, 1);
  TestValidator.equals("limit should be default (20)", pagination.limit, 20);
  TestValidator.predicate(
    "records count should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.equals(
    "pages should be calculated correctly",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // 5. Validate each configuration
  for (const config of response.data) {
    typia.assert(config);
    // Validate required fields exist and are not empty
    TestValidator.notEquals("id should not be empty", config.id, "");
    TestValidator.notEquals(
      "configuration_key should not be empty",
      config.configuration_key,
      "",
    );
    TestValidator.notEquals(
      "description should not be empty",
      config.description,
      "",
    );
    // Validate configuration_type is one of the valid values
    const validConfigTypes = ["string", "integer", "boolean", "json"] as const;
    const configType = typia.assert<"string" | "integer" | "boolean" | "json">(config.configuration_type);
    TestValidator.predicate(
      "configuration_type should be valid",
      validConfigTypes.includes(configType),
    );
    // Validate scope is one of the valid values
    const validScopes = ["global", "staging", "production"] as const;
    const scope = typia.assert<"global" | "staging" | "production">(config.scope);
    TestValidator.predicate(
      "scope should be valid",
      validScopes.includes(scope),
    );
    // Validate is_active is true for all returned configurations (no filter specified)
    TestValidator.equals(
      "configuration should be active",
      config.is_active,
      true,
    );
  }
}