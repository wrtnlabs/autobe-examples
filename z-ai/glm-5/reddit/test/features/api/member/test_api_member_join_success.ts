import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_join_success(connection: api.IConnection): Promise<void> {
    // Prepare registration data
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);
    const username = RandomGenerator.alphaNumeric(8);
    const href = typia.random<string & tags.Format<"uri">>();
    const referrer = typia.random<string & tags.Format<"uri">>();
    
    // Create member connection
    const memberConnection: api.IConnection = { host: connection.host };
    
    // Register member using utility function
    const authorized = await authorize_member_join(memberConnection, {
        body: {
            email,
            password,
            username,
            href,
            referrer,
        },
    });
    
    // Validate response structure
    typia.assert(authorized);
    
    // Validate business logic
    TestValidator.equals("username matches", authorized.username, username);
    TestValidator.equals("karma initialized to 0", authorized.karma, 0);
    TestValidator.equals("displayName defaults to username", authorized.displayName, username);
}