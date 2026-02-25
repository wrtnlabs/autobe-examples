import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_creation_successful(connection: api.IConnection): Promise<void> {
    // Create member connection
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            username: RandomGenerator.name(),
        },
    });
    // Create community
    const community = await generate_random_reddit_member_communities_create(memberConnection, {
        body: {
            name: "mycommunity",
        },
    });
    typia.assert(community);
    // Verify response
    TestValidator.equals("community name matches", community.name, "mycommunity");
    TestValidator.notEquals("owner is present", community.owner, null);
    TestValidator.equals("icon URL is default", community.icon_url, null);
    TestValidator.equals("subscriber count is 0", community.subscriber_count, 0);
}