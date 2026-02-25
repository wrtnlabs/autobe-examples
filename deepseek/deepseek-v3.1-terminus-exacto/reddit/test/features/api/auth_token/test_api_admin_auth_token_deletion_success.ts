import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_auth_token_deletion_success(connection: api.IConnection): Promise<void> {
    // 1. Create admin account and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {});
    typia.assert(admin);
    
    // adminConnection now has Authorization header set by authorize_admin_join
    
    // 2. Generate a random UUID for auth token ID
    const authTokenId = typia.random<string & tags.Format<"uuid">>();
    
    // 3. Delete the token using admin connection (which is authenticated)
    await api.functional.communityPlatform.admin.auth_tokens.erase(adminConnection, { authTokenId });
    
    // erase returns void, no response validation needed.
    
    // 4. Verify token is deleted by attempting to delete again (should fail)
    await TestValidator.error("deleted token cannot be deleted again", async () => {
        await api.functional.communityPlatform.admin.auth_tokens.erase(adminConnection, { authTokenId });
    });
}