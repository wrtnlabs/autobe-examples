import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_platform_configurations_create } from "../../../generate/generate_random_ecommerce_mall_admin_platform_configurations_create";
import { prepare_random_ecommerce_mall_platform_configuration } from "../../../prepare/prepare_random_ecommerce_mall_platform_configuration";

export async function test_api_platform_configuration_admin_create(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create platform configuration with integer type and global scope
  const config1 =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: "max_upload_size",
          description: "Maximum file upload size in MB",
          configuration_type: "integer",
          scope: "global",
          default_value: "100",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(config1);
  TestValidator.equals(
    "configuration id exists",
    config1.id !== undefined,
    true,
  );
  TestValidator.equals(
    "configuration key matches",
    config1.configuration_key,
    "max_upload_size",
  );
  TestValidator.equals(
    "description matches",
    config1.description,
    "Maximum file upload size in MB",
  );
  TestValidator.equals(
    "configuration type is integer",
    config1.configuration_type,
    "integer",
  );
  TestValidator.equals("scope is global", config1.scope, "global");
  TestValidator.equals("default value matches", config1.default_value, "100");
  TestValidator.equals("is active is true", config1.is_active, true);
  TestValidator.predicate("created_at exists and is valid date-time", () => {
    const date = new Date(config1.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at exists and is valid date-time", () => {
    const date = new Date(config1.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals("deleted_at is null", config1.deleted_at, null);
  // 3. Test different configuration_type values
  const config2 =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: "enable_guest_access",
          description: "Allow anonymous users to browse the platform",
          configuration_type: "boolean",
          scope: "staging",
          default_value: "false",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(config2);
  TestValidator.equals(
    "configuration type is boolean",
    config2.configuration_type,
    "boolean",
  );
  TestValidator.equals("scope is staging", config2.scope, "staging");
  // 4. Test string configuration type
  const config3 =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: "allowed_file_extensions",
          description: "Comma-separated list of allowed file extensions",
          configuration_type: "string",
          scope: "production",
          default_value: "jpg,png,pdf",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(config3);
  TestValidator.equals(
    "configuration type is string",
    config3.configuration_type,
    "string",
  );
  TestValidator.equals("scope is production", config3.scope, "production");
  // 5. Test JSON configuration type
  const config4 =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: "payment_gateway_config",
          description: "Payment gateway configuration JSON object",
          configuration_type: "json",
          scope: "global",
          default_value: JSON.stringify({ provider: "stripe", enabled: true }),
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(config4);
  TestValidator.equals(
    "configuration type is json",
    config4.configuration_type,
    "json",
  );
  // 6. Test configuration with null default value
  const config5 =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: "custom_feature_flag",
          description: "A feature flag that may not have a default value",
          configuration_type: "boolean",
          scope: "staging",
          default_value: null,
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(config5);
  TestValidator.equals(
    "null default value preserved",
    config5.default_value,
    null,
  );
}