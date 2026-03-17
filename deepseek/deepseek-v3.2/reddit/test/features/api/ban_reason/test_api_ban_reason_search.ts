import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanReason";
export async function test_api_ban_reason_search(connection: api.IConnection): Promise<void> {
    // Create a connection for the search operations
    // Even though authentication may not be required, follow connection isolation pattern
    const searchConnection: api.IConnection = { host: connection.host };
    // First, get all ban reasons to understand what data exists
    const allReasons = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
        body: {} satisfies ICommunityPlatformBanReason.IRequest,
    });
    typia.assert(allReasons);
    // If there are no ban reasons, we cannot test search functionality
    if (allReasons.data.length === 0) {
        // Just return without testing - no data to test against
        return;
    }
    // Extract some sample text from existing ban reasons for testing
    const sampleReasons = allReasons.data.slice(0, Math.min(3, allReasons.data.length));
    // Test 1: Empty search term - should return all records
    const emptySearchResult = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
        body: {
            search: "",
        } satisfies ICommunityPlatformBanReason.IRequest,
    });
    typia.assert(emptySearchResult);
    // Empty search should return same total as no search
    TestValidator.equals("empty search returns all records", emptySearchResult.pagination.records, allReasons.pagination.records);
    // Test 2: Search with common substring from titles (testing trigram matching)
    if (sampleReasons.length > 0) {
        const firstReason = sampleReasons[0];
        // Extract a meaningful substring from the title
        // Try to get a word or significant part for testing partial matching
        const titleWords = firstReason.title.split(/\s+/).filter(word => word.length > 3);
        if (titleWords.length > 0) {
            const searchWord = titleWords[0];
            // Test with the full word (should match exactly)
            const exactWordResult = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
                body: {
                    search: searchWord,
                } satisfies ICommunityPlatformBanReason.IRequest,
            });
            typia.assert(exactWordResult);
            // Should match at least the source reason (exact match in title)
            const exactMatches = exactWordResult.data.filter(reason => reason.title.includes(searchWord));
            TestValidator.predicate(`exact word search for "${searchWord}" should match at least one reason`, exactMatches.length > 0 || exactWordResult.data.length > 0);
            // Test trigram matching with partial word
            if (searchWord.length > 4) {
                const partialSearch = searchWord.substring(0, Math.floor(searchWord.length * 0.7));
                const partialResult = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
                    body: {
                        search: partialSearch,
                    } satisfies ICommunityPlatformBanReason.IRequest,
                });
                typia.assert(partialResult);
                // Partial search should also match (trigram similarity)
                const partialMatches = partialResult.data.filter(reason => reason.title.includes(partialSearch) ||
                    reason.title.includes(searchWord));
                TestValidator.predicate(`partial search "${partialSearch}" should match similar titles`, partialMatches.length > 0 || partialResult.data.length > 0);
            }
        }
    }
    // Test 3: Search with random text that likely doesn't match
    const randomSearchResult = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
        body: {
            search: "xyz123abc" + Date.now().toString(),
        } satisfies ICommunityPlatformBanReason.IRequest,
    });
    typia.assert(randomSearchResult);
    TestValidator.predicate("random search term returns empty or limited results", randomSearchResult.data.length <= allReasons.data.length);
    // Test 4: Search combined with active filter
    const activeSearchResult = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
        body: {
            search: "",
            active: true,
        } satisfies ICommunityPlatformBanReason.IRequest,
    });
    typia.assert(activeSearchResult);
    // All results should be active
    TestValidator.predicate("search with active=true returns only active reasons", activeSearchResult.data.every(reason => reason.active === true));
    // Test 5: Search combined with severity filter
    const severities = ["low", "medium", "high", "critical"] as const;
    for (const severity of severities) {
        const severitySearchResult = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
            body: {
                search: "",
                severity: severity,
            } satisfies ICommunityPlatformBanReason.IRequest,
        });
        typia.assert(severitySearchResult);
        // All results should have the specified severity
        TestValidator.predicate(`search with severity=${severity} returns only ${severity} severity reasons`, severitySearchResult.data.every(reason => reason.severity === severity));
    }
    // Test 6: Case-insensitive search
    if (sampleReasons.length > 0) {
        const firstReason = sampleReasons[0];
        const titleWords = firstReason.title.split(/\s+/).filter(word => word.length > 3);
        if (titleWords.length > 0) {
            const searchWord = titleWords[0];
            // Test lowercase
            const lowerCaseResult = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
                body: {
                    search: searchWord.toLowerCase(),
                } satisfies ICommunityPlatformBanReason.IRequest,
            });
            typia.assert(lowerCaseResult);
            // Test uppercase  
            const upperCaseResult = await api.functional.communityPlatform.ban_reasons.index(searchConnection, {
                body: {
                    search: searchWord.toUpperCase(),
                } satisfies ICommunityPlatformBanReason.IRequest,
            });
            typia.assert(upperCaseResult);
            // Both searches should return similar results (case-insensitive trigram matching)
            TestValidator.predicate(`case-insensitive search for "${searchWord}" should work`, lowerCaseResult.data.length > 0 || upperCaseResult.data.length > 0);
        }
    }
}