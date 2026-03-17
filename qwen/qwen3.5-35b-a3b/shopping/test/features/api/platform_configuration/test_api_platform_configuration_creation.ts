import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_platform_configurations_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_platform_configurations_create";
import { prepare_random_ecommerce_mall_platform_configuration } from "../../../prepare/prepare_random_ecommerce_mall_platform_configuration";

export async function test_api_platform_configuration_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Auth as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Setup: Create new connection with admin token
  const adminAuthorizedConnection: api.IConnection = { host: connection.host };
  adminAuthorizedConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 3. Create platform configuration with test data from scenario
  const platformConfiguration =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.create(
      adminAuthorizedConnection,
      {
        body: {
          configuration_key: "max_upload_size",
          description: "Maximum file upload size in bytes for user uploads",
          configuration_type: "integer" as const,
          scope: "global" as const,
          default_value: "10485760",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(platformConfiguration);
  // 4. Validate response contains all required fields
  TestValidator.equals(
    "configuration key matches",
    platformConfiguration.configuration_key,
    "max_upload_size",
  );
  TestValidator.equals(
    "description matches",
    platformConfiguration.description,
    "Maximum file upload size in bytes for user uploads",
  );
  TestValidator.equals(
    "configuration type is integer",
    platformConfiguration.configuration_type,
    "integer",
  );
  TestValidator.equals(
    "scope is global",
    platformConfiguration.scope,
    "global",
  );
  TestValidator.equals(
    "default value matches",
    platformConfiguration.default_value,
    "10485760",
  );
  TestValidator.predicate(
    "is active is true",
    platformConfiguration.is_active === true,
  );
  // 5. Validate timestamps are set (typia.assert ensures valid date-time format)
  TestValidator.predicate(
    "created_at is valid date-time",
    platformConfiguration.created_at !== undefined,
  );
  TestValidator.equals(
    "updated_at matches created_at",
    platformConfiguration.updated_at,
    platformConfiguration.created_at,
  );
  // 6. Validate soft deletion timestamp is null for active record
  TestValidator.equals(
    "deleted_at is null",
    platformConfiguration.deleted_at,
    null,
  );
}