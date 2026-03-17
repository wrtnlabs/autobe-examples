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

export async function test_api_platform_configuration_inactive_template(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token for platform configuration API
  const platformAdminConnection: api.IConnection = { host: connection.host };
  platformAdminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Generate random configuration with specific business requirements
  const configuration =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      platformAdminConnection,
      {
        body: {
          configuration_key: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<128>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<512>
          >(),
          configuration_type: "json",
          scope: "production",
          default_value: null,
          is_active: false,
        },
      },
    );
  // 4. Validate response
  typia.assert(configuration);
  // 5. Verify business logic: configuration is inactive but stored in database
  TestValidator.equals(
    "configuration should be inactive",
    configuration.is_active,
    false,
  );
  TestValidator.equals(
    "configuration type should be json",
    configuration.configuration_type,
    "json",
  );
  TestValidator.equals(
    "scope should be production",
    configuration.scope,
    "production",
  );
  TestValidator.equals(
    "default_value should be null",
    configuration.default_value,
    null,
  );
  TestValidator.equals(
    "configuration should not be deleted",
    configuration.deleted_at,
    null,
  );
}
