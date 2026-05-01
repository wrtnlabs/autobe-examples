import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_join_duplicate_email(connection: api.IConnection): Promise<void>
{
    const duplicateEmail = "duplicate@example.com";
    // First registration succeeds
    const firstConnection: api.IConnection = { host: connection.host };
    const firstMember = await authorize_member_join(firstConnection, {
        body: { email: duplicateEmail },
    });
    typia.assert(firstMember);
    // Second registration with same email fails
    const secondConnection: api.IConnection = { host: connection.host };
    await TestValidator.error("duplicate email returns 409", async () => {
        await authorize_member_join(secondConnection, {
            body: { email: duplicateEmail },
        });
    });
}