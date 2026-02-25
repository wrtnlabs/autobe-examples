import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";

export async function test_api_cache_configuration_snapshots_retrieve_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create and authorize super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create initial cache configuration
  const config =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {
        body: {
          cache_key: "test.session",
          cache_type: "redis",
          configuration_value: JSON.stringify({
            ttl: 3600,
            max_memory: "1gb",
          }),
          description: "Test session cache configuration",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(config);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // First modification to create first snapshot
  await api.functional.ecommerce.superAdministrator.cache_configurations.update(
    superAdminConnection,
    {
      configId: config.id,
      body: {
        cache_key: "test.session.v2",
      } satisfies IEcommerceCacheConfiguration.IUpdate,
    },
  );
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second modification to create second snapshot
  await api.functional.ecommerce.superAdministrator.cache_configurations.update(
    superAdminConnection,
    {
      configId: config.id,
      body: {
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<6> & tags.Maximum<10>
        >(),
      } satisfies IEcommerceCacheConfiguration.IUpdate,
    },
  );
  // Test retrieval without filters
  const allSnapshots =
    await api.functional.ecommerce.superAdministrator.cache_configurations.snapshots.index(
      superAdminConnection,
      {
        configId: config.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Test pagination with different page size
  const smallPage =
    await api.functional.ecommerce.superAdministrator.cache_configurations.snapshots.index(
      superAdminConnection,
      {
        configId: config.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(smallPage);
  // Verify snapshot data structure
  TestValidator.equals(
    "pagination has current page",
    smallPage.pagination.limit,
    2,
  );
}
