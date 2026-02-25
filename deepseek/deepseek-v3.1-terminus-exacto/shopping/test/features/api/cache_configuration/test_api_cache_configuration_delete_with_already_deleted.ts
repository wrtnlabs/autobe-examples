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
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";
import { generate_random_ecommerce_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_create";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cache_configuration_delete_with_already_deleted(connection: api.IConnection): Promise<void> {
    // Create administrator connection
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "temp1234!" satisfies string & tags.Format<"password"> as string & tags.Format<"password">,
        } satisfies IEcommerceAdministrator.IJoin,
    });
    typia.assert(admin);
    
    // Create cache configuration
    const config = await generate_random_ecommerce_administrator_cache_configurations_create(adminConnection, {
        body: {
            cache_key: "test.cache.config",
            cache_type: "redis",
            configuration_value: JSON.stringify({ ttl: 3600 }),
            description: "Test configuration",
            is_active: true,
            priority: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>>(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
    });
    typia.assert(config);
    
    // First deletion (should succeed)
    await api.functional.ecommerce.administrator.cache_configurations.erase(adminConnection, {
        configId: config.id,
    });
    
    // Second deletion attempt (should fail)
    await TestValidator.error("should fail when deleting already deleted cache configuration", async () => {
        await api.functional.ecommerce.administrator.cache_configurations.erase(adminConnection, {
            configId: config.id,
        });
    });
}