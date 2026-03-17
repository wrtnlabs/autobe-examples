import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test community search functionality with partial matching across name and description fields.
 * Creates multiple communities with programming, gaming, and art keywords, then tests various
 * search scenarios including partial matches, case-insensitive search, and empty results.
 */
export async function test_api_communities_search_filtering(connection: api.IConnection): Promise<void> {
    // 1. Create member account for community creation
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {});
    typia.assert(member);
    // 2. Create test communities with varied keywords
    const communities: ICommunityPlatformCommunity[] = [];
    // Programming-related communities
    const programmingCommunity1 = await generate_random_community_platform_member_communities_create(memberConnection, {
        body: {
            name: "python-programming-hub",
            description: "Community for Python programming enthusiasts",
        },
    });
    typia.assert(programmingCommunity1);
    communities.push(programmingCommunity1);
    const programmingCommunity2 = await generate_random_community_platform_member_communities_create(memberConnection, {
        body: {
            name: "javascript-developers",
            description: "Discussion space for JavaScript programmers",
        },
    });
    typia.assert(programmingCommunity2);
    communities.push(programmingCommunity2);
    // Gaming-related communities
    const gamingCommunity1 = await generate_random_community_platform_member_communities_create(memberConnection, {
        body: {
            name: "gaming-universe",
            description: "All things gaming from AAA to indie",
        },
    });
    typia.assert(gamingCommunity1);
    communities.push(gamingCommunity1);
    const gamingCommunity2 = await generate_random_community_platform_member_communities_create(memberConnection, {
        body: {
            name: "retro-gaming-community",
            description: "Classic games and retro consoles",
        },
    });
    typia.assert(gamingCommunity2);
    communities.push(gamingCommunity2);
    // Art-related community (art in description only)
    const artCommunity = await generate_random_community_platform_member_communities_create(memberConnection, {
        body: {
            name: "digital-art-gallery",
            description: "Showcase and discuss digital art creations",
        },
    });
    typia.assert(artCommunity);
    communities.push(artCommunity);
    // Neutral community
    const neutralCommunity = await generate_random_community_platform_member_communities_create(memberConnection, {
        body: {
            name: "general-discussions",
            description: RandomGenerator.paragraph({ sentences: 2 }),
        },
    });
    typia.assert(neutralCommunity);
    communities.push(neutralCommunity);
    // Small delay to ensure database consistency
    await new Promise((resolve) => setTimeout(resolve, 100));
    // 3. Test 1: Partial matching with "program" (should match programming communities)
    const searchResult1 = await api.functional.communityPlatform.communities.index(connection, // Public endpoint, no auth required
    {
        body: {
            search: "program" satisfies (string & tags.MaxLength<100>),
            page: 1 satisfies (number & tags.Type<"int32"> & tags.Minimum<1>),
            limit: 20 satisfies (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>),
        } satisfies ICommunityPlatformCommunity.IRequest,
    });
    typia.assert(searchResult1);
    // Verify only programming communities are returned
    TestValidator.equals("program search returns programming communities", searchResult1.data.length, 2);
    for (const community of searchResult1.data) {
        const nameDesc = `${community.name} ${community.description ?? ""}`.toLowerCase();
        TestValidator.predicate(`community ${community.name} contains program keyword`, nameDesc.includes("program"));
    }
    TestValidator.equals("pagination records reflects filtered count", searchResult1.pagination.records, 2);
    // Test 2: Case-insensitive search with "GAMING"
    const searchResult2 = await api.functional.communityPlatform.communities.index(connection, {
        body: {
            search: "GAMING" satisfies (string & tags.MaxLength<100>),
            page: 1 satisfies (number & tags.Type<"int32"> & tags.Minimum<1>),
            limit: 20 satisfies (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>),
        } satisfies ICommunityPlatformCommunity.IRequest,
    });
    typia.assert(searchResult2);
    TestValidator.equals("uppercase GAMING search returns gaming communities", searchResult2.data.length, 2);
    for (const community of searchResult2.data) {
        const nameDesc = `${community.name} ${community.description ?? ""}`.toLowerCase();
        TestValidator.predicate(`community ${community.name} contains gaming keyword`, nameDesc.includes("gaming"));
    }
    TestValidator.equals("pagination records reflects filtered count for gaming", searchResult2.pagination.records, 2);
}