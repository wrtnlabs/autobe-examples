import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_subscription_list_search(connection: api.IConnection): Promise<void> {
    // 1. Create authenticated member
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(),
            displayName: null,
        },
    });
    // 2. Create multiple communities for subscription testing
    const communities = ArrayUtil.repeat(5, () => ({
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
    }));
    // Create communities and subscribe member to each
    const createdCommunities: IRedditCloneCommunity.ISummary[] = [];
    for (const communityData of communities) {
        // Create community (simulated - in real scenario would need owner)
        const community: IRedditCloneCommunity.ISummary = {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: communityData.name,
            description: communityData.description,
            subscriberCount: 0,
            createdAt: new Date().toISOString(),
            owner: {
                id: member.id,
                username: member.username,
                displayName: member.displayName,
                avatarUrl: null,
            },
        };
        createdCommunities.push(community);
    }
    // Subscribe member to all communities
    for (const community of createdCommunities) {
        await api.functional.redditClone.member.communities.subscribe.postByCommunityid(memberConnection, {
            communityId: community.id,
        });
    }
    // 3. Test search with exact name match (case-insensitive)
    const searchTerm = createdCommunities[0].name.toUpperCase();
    const searchResponse = await api.functional.redditClone.member.subscriptions.index(memberConnection, {
        body: {
            name: searchTerm,
        },
    });
    typia.assert(searchResponse);
    // Verify search result contains the matching community
    TestValidator.equals("search returns exact match", searchResponse.data.length, 1);
    TestValidator.equals("search result name matches", searchResponse.data[0].name, createdCommunities[0].name);
    // 4. Test search with partial name (case-insensitive)
    const partialTerm = createdCommunities[1].name.substring(0, 2).toUpperCase();
    const partialResponse = await api.functional.redditClone.member.subscriptions.index(memberConnection, {
        body: {
            name: partialTerm,
        },
    });
    typia.assert(partialResponse);
    TestValidator.predicate("partial search returns matching community", partialResponse.data.some((c) => c.name === createdCommunities[1].name));
    // 5. Test search with no matches
    const noMatchTerm = "nonexistentcommunity";
    const noMatchResponse = await api.functional.redditClone.member.subscriptions.index(memberConnection, {
        body: {
            name: noMatchTerm,
        },
    });
    typia.assert(noMatchResponse);
    TestValidator.equals("no match returns empty", noMatchResponse.data.length, 0);
    TestValidator.equals("no match records is 0", noMatchResponse.pagination.records, 0);
    // 6. Test search with pagination metadata
    TestValidator.equals("pagination current is 1", noMatchResponse.pagination.current, 1);
    TestValidator.equals("pagination limit is default", noMatchResponse.pagination.limit, 20);
}