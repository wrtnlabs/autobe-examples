import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_discovery_with_subscription_status(connection: api.IConnection): Promise<void> {
    // Authenticate as community owner
    const ownerConnection: api.IConnection = { host: connection.host };
    const ownerData = await authorize_community_owner_join(ownerConnection, {
        body: {
            email: typia.random<string & tags.Format<'email'>>(),
            password: RandomGenerator.alphaNumeric(16),
            displayName: RandomGenerator.name(),
        },
    });
    typia.assert(ownerData);
    const ownerToken = ownerData.token.access;
    
    // Use owner's connection to fetch all communities
    const discoveryConnection: api.IConnection = { host: connection.host };
    discoveryConnection.headers = { Authorization: ownerToken };
    const response = await api.functional.redditCommunity.communityOwner.communities.index(discoveryConnection, {
        body: {},
    });
    typia.assert(response);
    
    // Validate pagination and response structure
    TestValidator.equals("pagination exists", response.pagination.current, 1);
    TestValidator.equals("pagination limit", response.pagination.limit, 25);
    TestValidator.predicate("has records", response.pagination.records >= 0);
    TestValidator.predicate("has data array", response.data.length >= 0);
    
    // Validate that all objects in data match IRedditCommunityCommunity.ISummary
    // All properties must exist and be correct types
    response.data.forEach(community => {
        TestValidator.equals("community has id", typeof community.id, "string");
        TestValidator.predicate("community has valid uuid", /^[0-9a-f-]{36}$/i.test(community.id));
        TestValidator.equals("community has name", typeof community.name, "string");
        TestValidator.equals("community has description", typeof community.description, "string");
        TestValidator.equals("community has subscriber_count", typeof community.subscriber_count, "number");
        TestValidator.predicate("subscriber_count is non-negative", community.subscriber_count >= 0);
        TestValidator.equals("community has created_at", typeof community.created_at, "string");
        TestValidator.predicate("created_at is ISO date-time", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(community.created_at));
    });
}