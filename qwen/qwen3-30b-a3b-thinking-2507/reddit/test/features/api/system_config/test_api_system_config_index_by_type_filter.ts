import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemConfig";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_config_index_by_type_filter(connection: api.IConnection): Promise<void> {
    // Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {
            email: "admin@test.com",
            password: "1234",
        }
    });

    // Test filtering by 'string' type
    const stringConfigs = await api.functional.communityPlatform.admin.system.configs.index(adminConnection, {
        body: {
            type: "string",
        }
    });
    typia.assert(stringConfigs);
    
    // Verify all configs are of type 'string'
    for (const config of stringConfigs.data) {
        TestValidator.equals("config type", config.type, "string");
    }
    
    // Test filtering by 'boolean' type
    const booleanConfigs = await api.functional.communityPlatform.admin.system.configs.index(adminConnection, {
        body: {
            type: "boolean",
        }
    });
    typia.assert(booleanConfigs);
    
    // Verify all configs are of type 'boolean'
    for (const config of booleanConfigs.data) {
        TestValidator.equals("config type", config.type, "boolean");
    }
    
    // Test filtering by 'int' type
    const intConfigs = await api.functional.communityPlatform.admin.system.configs.index(adminConnection, {
        body: {
            type: "int",
        }
    });
    typia.assert(intConfigs);
    
    // Verify all configs are of type 'int'
    for (const config of intConfigs.data) {
        TestValidator.equals("config type", config.type, "int");
    }
}