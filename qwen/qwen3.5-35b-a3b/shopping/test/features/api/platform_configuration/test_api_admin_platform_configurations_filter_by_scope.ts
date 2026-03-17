import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallPlatformConfiguration";
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

export async function test_api_admin_platform_configurations_filter_by_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com",
      },
    },
  );
  typia.assert(admin);
  // 2. Create configurations with different scopes
  const globalConfig: IEcommerceMallPlatformConfiguration =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<128>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<512>
          >(),
          configuration_type: "string",
          scope: "global",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(globalConfig);
  const stagingConfig1: IEcommerceMallPlatformConfiguration =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<128>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<512>
          >(),
          configuration_type: "string",
          scope: "staging",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(stagingConfig1);
  const stagingConfig2: IEcommerceMallPlatformConfiguration =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<128>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<512>
          >(),
          configuration_type: "string",
          scope: "staging",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(stagingConfig2);
  const productionConfig1: IEcommerceMallPlatformConfiguration =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<128>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<512>
          >(),
          configuration_type: "string",
          scope: "production",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(productionConfig1);
  const productionConfig2: IEcommerceMallPlatformConfiguration =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<128>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<512>
          >(),
          configuration_type: "string",
          scope: "production",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(productionConfig2);
  // 3. Test filtering by scope="staging"
  const stagingFilterResponse: IPageIEcommerceMallPlatformConfiguration.ISummary =
    await api.functional.ecommerceMall.admin.platform_configurations.index(
      adminConnection,
      {
        body: {
          scope: "staging",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallPlatformConfiguration.IRequest,
      },
    );
  typia.assert(stagingFilterResponse);
  // Validate staging filter results
  TestValidator.equals(
    "staging filter total records",
    stagingFilterResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "staging filter current page",
    stagingFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "staging filter limit",
    stagingFilterResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "staging filter total pages",
    stagingFilterResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "staging filter data count",
    stagingFilterResponse.data.length,
    2,
  );
  // Verify all returned configurations have scope="staging"
  for (const config of stagingFilterResponse.data) {
    typia.assert(config);
    TestValidator.equals("staging config scope", config.scope, "staging");
  }
  // 4. Test filtering by scope="production"
  const productionFilterResponse: IPageIEcommerceMallPlatformConfiguration.ISummary =
    await api.functional.ecommerceMall.admin.platform_configurations.index(
      adminConnection,
      {
        body: {
          scope: "production",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallPlatformConfiguration.IRequest,
      },
    );
  typia.assert(productionFilterResponse);
  // Validate production filter results
  TestValidator.equals(
    "production filter total records",
    productionFilterResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "production filter current page",
    productionFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "production filter limit",
    productionFilterResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "production filter total pages",
    productionFilterResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "production filter data count",
    productionFilterResponse.data.length,
    2,
  );
  // Verify all returned configurations have scope="production"
  for (const config of productionFilterResponse.data) {
    typia.assert(config);
    TestValidator.equals("production config scope", config.scope, "production");
  }
}
