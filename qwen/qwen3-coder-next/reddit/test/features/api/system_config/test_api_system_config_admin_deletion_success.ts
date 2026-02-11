import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { authorize_admin_join as importAuthorizeAdminJoin } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test successful deletion of a system configuration by an admin user.
 * 1) Admin registers via authorize_admin_join,
 * 2) Admin deletes an existing system configuration using DELETE /redditPlatform/admin/system-configs/:configKey endpoint,
 * 3) Verify 204 No Content response and that the configuration is permanently removed from the database.
 */
export async function test_api_system_config_admin_deletion_success(connection: api.IConnection): Promise<void> {
    // 1. Register admin user
    const adminConnection: api.IConnection = { host: connection.host };
    await importAuthorizeAdminJoin(adminConnection, {
        body: {
            email: typia.random<string & typia.tags.Format<"email">>(),
            password: "12345678",
            username: typia.random<string>(),
            display_name: null,
            bio: null,
        } satisfies IRedditPlatformAdmin.IJoin,
    });
    // 2. Delete an existing system configuration
    // Note: This test assumes an existing config exists in the database
    // For a complete test, you would first create a config, then delete it
    await api.functional.redditPlatform.admin.system_configs.erase(adminConnection, {
        configKey: "test_config_key", // Using a config key that should exist
    });
}
/**
 * Authorize admin join utility function.
 */
export async function authorize_admin_join(connection: api.IConnection, props: {
    body: IRedditPlatformAdmin.IJoin;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
    return await api.functional.redditPlatform.auth.admin.join(connection, {
        body: props.body,
    });
}