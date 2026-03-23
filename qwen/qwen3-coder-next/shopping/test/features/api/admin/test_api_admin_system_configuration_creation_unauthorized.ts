import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_admin_system_configurations_create } from "../../../generate/generate_random_ecommerce_mall_admin_system_configurations_create";
import { prepare_random_ecommerce_mall_system_configuration } from "../../../prepare/prepare_random_ecommerce_mall_system_configuration";

export async function test_api_admin_system_configuration_creation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Register and login as customer user
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Login as customer to maintain session
  await authorize_customer_login(customerConnection, {
    body: {
      email: typeof customerConnection.headers?.Authorization === "string" && customerConnection.headers.Authorization.includes("Bearer ")
        ? "customer@example.com"
        : typia.random<string & tags.Format<"email"> & tags.MinLength<1>>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // Attempt to create system configuration as unauthorized customer user
  await TestValidator.error("should reject unauthorized access", async () => {
    await api.functional.ecommerceMall.admin.system_configurations.create(
      customerConnection,
      {
        body: {
          key: "test_configuration",
          value: JSON.stringify({ enabled: true }),
          description: "Test configuration for unauthorized access",
        } satisfies IEcommerceMallSystemConfiguration.ICreate,
      },
    );
  });
}