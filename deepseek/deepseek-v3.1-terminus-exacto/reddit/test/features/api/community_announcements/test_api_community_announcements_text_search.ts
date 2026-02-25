import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";

export async function test_api_community_announcements_text_search(connection: api.IConnection): Promise<void> {
    // Generate a valid UUID for communityId
    const communityId = typia.random<string & tags.Format<"uuid">>();
    
    // Test 1: Search with empty string should work with default pagination
    const emptySearch = await api.functional.communityPlatform.communities.announcements.index(connection, {
        communityId,
        body: {
            search: "",
            page: 1,
            limit: 10,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
    });
    typia.assert(emptySearch);
    
    // Test 2: Search with partial matching
    const partialSearch = await api.functional.communityPlatform.communities.announcements.index(connection, {
        communityId,
        body: {
            search: RandomGenerator.alphabets(5),
            page: 1,
            limit: 5,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
    });
    typia.assert(partialSearch);
    
    // Test 3: Search combined with status filter
    const searchWithStatus = await api.functional.communityPlatform.communities.announcements.index(connection, {
        communityId,
        body: {
            search: RandomGenerator.alphabets(3),
            status: "published",
            page: 1,
            limit: 5,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
    });
    typia.assert(searchWithStatus);
    
    // Test 4: Search combined with pinned filter
    const searchWithPinned = await api.functional.communityPlatform.communities.announcements.index(connection, {
        communityId,
        body: {
            search: RandomGenerator.alphabets(4),
            is_pinned: false,
            page: 2,
            limit: 3,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
    });
    typia.assert(searchWithPinned);
    
    // Test 5: Edge case with special characters
    const specialCharSearch = await api.functional.communityPlatform.communities.announcements.index(connection, {
        communityId,
        body: {
            search: "@#$%^&*()",
            page: 1,
            limit: 5,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
    });
    typia.assert(specialCharSearch);
    
    // Validate pagination metadata
    TestValidator.equals("pagination current page", emptySearch.pagination.current, 1);
    TestValidator.equals("pagination limit", emptySearch.pagination.limit, 10);
    TestValidator.predicate("records count non-negative", emptySearch.pagination.records >= 0);
    TestValidator.predicate("pages count non-negative", emptySearch.pagination.pages >= 0);
}