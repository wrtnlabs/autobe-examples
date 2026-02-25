import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";
import { generate_random_ecommerce_super_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_create";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_cache_configuration_snapshots_empty_results(connection: api.IConnection): Promise<void> {
    // Create super administrator connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_administrator_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceSuperAdministrator.IJoin,
    });
    typia.assert(superAdmin);

    // Create a minimal cache configuration
    const cacheConfig = await generate_random_ecommerce_super_administrator_cache_configurations_create(superAdminConnection, {
        body: {
            cache_key: RandomGenerator.alphabets(10),
            cache_type: "memory",
            configuration_value: JSON.stringify({ ttl: 3600 }),
            description: null,
            is_active: true,
            priority: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>>(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
    });
    typia.assert(cacheConfig);

    // Test 1: Empty snapshot history for newly created configuration
    const emptySnapshots = await api.functional.ecommerce.superAdministrator.cache_configurations.snapshots.index(superAdminConnection, {
        configId: cacheConfig.id,
        body: {
            page: 1,
            limit: 10,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
    });
    typia.assert(emptySnapshots);

    // Validate empty pagination metadata
    TestValidator.equals("empty snapshots should have zero records", emptySnapshots.pagination.records, 0);
    TestValidator.equals("empty snapshots should have zero pages", emptySnapshots.pagination.pages, 0);
    TestValidator.equals("empty snapshots should have empty data array", emptySnapshots.data.length, 0);

    // Test 2: Filter with empty criteria (should return no results since no snapshots exist)
    const filteredSnapshots = await api.functional.ecommerce.superAdministrator.cache_configurations.snapshots.index(superAdminConnection, {
        configId: cacheConfig.id,
        body: {
            page: 1,
            limit: 10,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
    });
    typia.assert(filteredSnapshots);

    // Validate filtered results
    TestValidator.equals("filtered snapshots should have zero records", filteredSnapshots.pagination.records, 0);
    TestValidator.equals("filtered snapshots should have zero pages", filteredSnapshots.pagination.pages, 0);
    TestValidator.equals("filtered snapshots should have empty data array", filteredSnapshots.data.length, 0);

    // Test 3: Invalid configuration ID should return proper HTTP error
    await TestValidator.httpError("invalid config ID should throw HTTP error", [404, 400], async () => {
        await api.functional.ecommerce.superAdministrator.cache_configurations.snapshots.index(superAdminConnection, {
            configId: typia.random<string & tags.Format<"uuid">>(),
            body: {
                page: 1,
                limit: 10,
            } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
        });
    });

    // Test 4: Edge case with max limit (should handle gracefully)
    const maxLimitSnapshots = await api.functional.ecommerce.superAdministrator.cache_configurations.snapshots.index(superAdminConnection, {
        configId: cacheConfig.id,
        body: {
            page: 1,
            limit: 100, // Max allowed limit
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
    });
    typia.assert(maxLimitSnapshots);

    // Validate max limit pagination
    TestValidator.equals("max limit snapshots should have zero records", maxLimitSnapshots.pagination.records, 0);
    TestValidator.equals("max limit snapshots should have zero pages", maxLimitSnapshots.pagination.pages, 0);
    TestValidator.equals("max limit snapshots should have empty data array", maxLimitSnapshots.data.length, 0);
}