import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { prepare_random_ecommerce_mall_platform_configuration } from "../../../prepare/prepare_random_ecommerce_mall_platform_configuration";
import { generate_random_ecommerce_mall_super_admin_platform_configurations_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_platform_configurations_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
/**
 * Test that the same configuration key can be defined for different scopes.
 * This validates business logic where configuration keys can be scoped to different
 * environments (staging, production) while maintaining independent values.
 */
export async function test_api_platform_configuration_same_key_different_scope(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as super administrator
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_super_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(12),
            display_name: RandomGenerator.name(),
        } satisfies IEcommerceMallSuperAdmin.IJoin,
    });
    typia.assert(adminAuth);
    // 2. Create first platform configuration for staging environment
    const stagingKey = "debug_logging";
    const stagingConfig = await api.functional.ecommerceMall.superAdmin.platform_configurations.create(adminConnection, {
        body: {
            configuration_key: stagingKey,
            description: "Enable debug logging in staging environment",
            configuration_type: "boolean",
            scope: "staging" as const,
            default_value: "true",
            is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
    });
    typia.assert(stagingConfig);
    // 3. Verify first configuration is created successfully for staging scope
    TestValidator.equals("staging configuration key matches", stagingConfig.configuration_key, stagingKey);
    TestValidator.equals("staging configuration scope", stagingConfig.scope, "staging");
    TestValidator.equals("staging default value", stagingConfig.default_value, "true");
    TestValidator.predicate("staging configuration is active", stagingConfig.is_active === true);
    // 4. Create second platform configuration with same key but different scope (production)
    const productionConfig = await api.functional.ecommerceMall.superAdmin.platform_configurations.create(adminConnection, {
        body: {
            configuration_key: stagingKey, // Same key as staging
            description: "Disable debug logging in production environment",
            configuration_type: "boolean",
            scope: "production" as const,
            default_value: "false",
            is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
    });
    typia.assert(productionConfig);
    // 5. Verify second configuration is created successfully for production scope
    TestValidator.equals("production configuration key matches", productionConfig.configuration_key, stagingKey);
    TestValidator.equals("production configuration scope", productionConfig.scope, "production");
    TestValidator.equals("production default value", productionConfig.default_value, "false");
    TestValidator.predicate("production configuration is active", productionConfig.is_active === true);
    // 6. Confirm both configurations exist with different scopes (uniqueness constraint is on key+scope combination)
    TestValidator.notEquals("staging and production have different scopes", stagingConfig.scope, productionConfig.scope);
    // 7. Validate that both configurations can coexist with same key
    TestValidator.equals("staging config ID is different from production config ID", stagingConfig.id, productionConfig.id);
    // 8. Verify configuration values are independent per scope
    TestValidator.notEquals("staging and production have different default values", stagingConfig.default_value, productionConfig.default_value);
}