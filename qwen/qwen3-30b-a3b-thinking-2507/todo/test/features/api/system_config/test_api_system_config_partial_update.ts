import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
export async function test_api_system_config_partial_update(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    
    // 2. Get current system config
    const currentConfig = await api.functional.todo.system_configs.index(adminConnection, {
        body: {}
    });
    typia.assert(currentConfig);
    
    // 3. Verify current email verification timeout is 15
    TestValidator.equals("current email_verification_timeout must be 15", currentConfig.email_verification_timeout, 15);
    
    // 4. Update email verification timeout to 45 minutes
    const updatedConfig = await api.functional.todo.system_configs.index(adminConnection, {
        body: {
            email_verification_timeout: 45,
        },
    });
    typia.assert(updatedConfig);
    
    // 5. Validate partial update
    TestValidator.equals("email_verification_timeout should be 45", updatedConfig.email_verification_timeout, 45);
    TestValidator.equals("password_reset_timeout should remain unchanged", updatedConfig.password_reset_timeout, currentConfig.password_reset_timeout);
    TestValidator.equals("feature_flags should remain unchanged", updatedConfig.feature_flags, currentConfig.feature_flags);
}