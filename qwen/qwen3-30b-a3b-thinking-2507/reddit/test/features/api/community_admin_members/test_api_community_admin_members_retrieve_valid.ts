import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_community_admin_members_retrieve_valid(connection: api.IConnection) {
    const adminConnection: api.IConnection = { host: connection.host };
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminPassword = RandomGenerator.alphaNumeric(16);
    const adminUsername = RandomGenerator.name();
    
    // Register new admin account
    await authorize_admin_join(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
            username: adminUsername,
        },
    });
    
    // Login as admin
    await authorize_admin_login(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
        },
    });
    
    // Retrieve member profile
    const memberId = typia.random<string & tags.Format<"uuid">>();
    const profile = await api.functional.community.admin.members.at(adminConnection, {
        id: memberId,
    });
    
    typia.assert(profile);
}