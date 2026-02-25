import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";

export async function test_api_cache_configuration_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create initial cache configuration
  const config1 =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: "test.redis.session",
          cache_type: "redis",
          configuration_value: JSON.stringify({ ttl: 3600, max_memory: "1gb" }),
          description: "Initial test configuration",
          is_active: true,
          priority: 1,
        },
      },
    );
  typia.assert(config1);
  // 3. First update - create snapshot 1
  const update1 =
    await api.functional.ecommerce.administrator.cache_configurations.update(
      adminConnection,
      {
        configId: config1.id,
        body: {
          description: "First updated description",
          is_active: false,
        } satisfies IEcommerceCacheConfiguration.IUpdate,
      },
    );
  typia.assert(update1);
  // 4. Second update - create snapshot 2 (target snapshot)
  const originalPriority = update1.priority;
  const update2 =
    await api.functional.ecommerce.administrator.cache_configurations.update(
      adminConnection,
      {
        configId: config1.id,
        body: {
          priority: originalPriority + 1,
          cache_key: "test.redis.session.v2",
        } satisfies IEcommerceCacheConfiguration.IUpdate,
      },
    );
  typia.assert(update2);
  const snapshot2Id = typia.random<string & typia.tags.Format<"uuid">>();
  // 5. Third update - create snapshot 3
  const update3 =
    await api.functional.ecommerce.administrator.cache_configurations.update(
      adminConnection,
      {
        configId: config1.id,
        body: {
          configuration_value: { ttl: "7200", max_memory: "2gb" },
          description: "Third update with increased TTL",
        } satisfies IEcommerceCacheConfiguration.IUpdate,
      },
    );
  typia.assert(update3);
  // 6. Retrieve and validate snapshot 2
  const snapshot2 =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.at(
      adminConnection,
      {
        configId: config1.id,
        snapshotId: snapshot2Id,
      },
    );
  typia.assert(snapshot2);
  // 7. Validate snapshot properties
  TestValidator.equals(
    "snapshot contains suspension_reason field",
    typeof snapshot2.suspension_reason,
    "string",
  );
  TestValidator.predicate(
    "suspension_reason is not empty",
    snapshot2.suspension_reason.length > 0,
  );
  TestValidator.equals(
    "snapshot has correct suspension_start_date format",
    typeof snapshot2.suspension_start_date,
    "string",
  );
  TestValidator.equals(
    "snapshot status is valid",
    typeof snapshot2.status,
    "string",
  );
  TestValidator.predicate(
    "snapshot has proper administrator relation",
    snapshot2.administrator !== undefined,
  );
  TestValidator.equals(
    "administrator email matches",
    snapshot2.administrator.email,
    admin.email,
  );
  // 8. Verify snapshot references correct cache configuration
  // The snapshot should be linked to the cache configuration through the administrator
  TestValidator.predicate(
    "snapshot belongs to an administrator",
    snapshot2.administrator.id === admin.id,
  );
  // 9. Validate audit trail sequence
  TestValidator.predicate(
    "snapshot created_at is valid timestamp",
    !isNaN(new Date(snapshot2.created_at).getTime()),
  );
  TestValidator.predicate(
    "snapshot updated_at is valid timestamp",
    !isNaN(new Date(snapshot2.updated_at).getTime()),
  );
  // 10. Verify snapshot captures mid-sequence state
  // The snapshot was taken after first update but before third update
  TestValidator.notEquals(
    "snapshot differs from initial configuration",
    snapshot2.suspension_reason,
    "Initial test configuration",
  );
  TestValidator.notEquals(
    "snapshot differs from final configuration",
    snapshot2.suspension_reason,
    "Third update with increased TTL",
  );
}