import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
export async function test_api_system_config_email_verification_timeout_change(connection: api.IConnection): Promise<void> {
    const updatedConfig = await api.functional.todo.system_configs.index(connection, {
        body: {
            email_verification_timeout: 30,
        }
    });
    typia.assert(updatedConfig);
    TestValidator.equals("email verification timeout should be 30 minutes", updatedConfig.email_verification_timeout, 30);
}