import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeGuest";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
export async function test_api_guest_listing_date_range_and_expired_filter(connection: api.IConnection): Promise<void> {
    // Since this is a list endpoint, we work with the base connection
    // No authentication required per API spec: @x-autobe-authorization-type null
    // Define date ranges for filtering
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Test 1: Date range filtering with createdAtFrom and createdAtTo
    const dateRangeRequest = {
        body: {
            createdAtFrom: sevenDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            page: 1,
            limit: 10,
            sortBy: "createdAt",
            sortOrder: "desc",
        } satisfies IRedditLikeGuest.IRequest,
    };
    const dateRangeResponse = await api.functional.redditLike.guests.index(connection, dateRangeRequest);
    typia.assert(dateRangeResponse);
    // Verify pagination structure
    TestValidator.equals("pagination has valid current page", dateRangeResponse.pagination.current, 1);
    TestValidator.predicate("pagination limit is positive", dateRangeResponse.pagination.limit > 0);
    TestValidator.predicate("pagination records is non-negative", dateRangeResponse.pagination.records >= 0);
    TestValidator.predicate("pagination pages is non-negative", dateRangeResponse.pagination.pages >= 0);
    // Verify data array
    TestValidator.predicate("data is an array", Array.isArray(dateRangeResponse.data));
    // Test 2: Filter guests created in the last 24 hours only
    const recentRequest = {
        body: {
            createdAtFrom: oneDayAgo.toISOString(),
            createdAtTo: now.toISOString(),
            page: 1,
            limit: 100,
        } satisfies IRedditLikeGuest.IRequest,
    };
    const recentResponse = await api.functional.redditLike.guests.index(connection, recentRequest);
    typia.assert(recentResponse);
    // Test 3: Test includeExpired filter - default (false) should exclude soft-deleted
    const activeOnlyRequest = {
        body: {
            createdAtFrom: thirtyDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            includeExpired: false,
            page: 1,
            limit: 100,
        } satisfies IRedditLikeGuest.IRequest,
    };
    const activeOnlyResponse = await api.functional.redditLike.guests.index(connection, activeOnlyRequest);
    typia.assert(activeOnlyResponse);
    // All returned guests should have null deleted_at when includeExpired is false
    for (const guest of activeOnlyResponse.data) {
        TestValidator.equals(`guest ${guest.id} should not be expired (deleted_at is null)`, guest.deleted_at, null);
    }
    // Test 4: Test includeExpired filter set to true - should include soft-deleted guests
    const withExpiredRequest = {
        body: {
            createdAtFrom: thirtyDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            includeExpired: true,
            page: 1,
            limit: 100,
        } satisfies IRedditLikeGuest.IRequest,
    };
    const withExpiredResponse = await api.functional.redditLike.guests.index(connection, withExpiredRequest);
    typia.assert(withExpiredResponse);
    // With includeExpired true, results may contain both active and expired guests
    // Verify that expired guests have valid deleted_at timestamps
    const expiredGuests = withExpiredResponse.data.filter((guest) => guest.deleted_at !== null);
    for (const expiredGuest of expiredGuests) {
        // Verify deleted_at is a valid ISO datetime string when not null
        TestValidator.predicate(`expired guest ${expiredGuest.id} has valid deleted_at timestamp`, expiredGuest.deleted_at !== null && typeof expiredGuest.deleted_at === "string");
    }
    // Test 5: Verify pagination counts reflect filtered results
    // When includeExpired is true, total records should be >= when includeExpired is false
    TestValidator.predicate("includeExpired=true should return equal or more records than includeExpired=false", withExpiredResponse.pagination.records >= activeOnlyResponse.pagination.records);
    // Test 6: Combined filter - date range + includeExpired
    const combinedFilterRequest = {
        body: {
            createdAtFrom: sevenDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            includeExpired: true,
            sortBy: "createdAt",
            sortOrder: "desc",
            page: 1,
            limit: 50,
        } satisfies IRedditLikeGuest.IRequest,
    };
    const combinedResponse = await api.functional.redditLike.guests.index(connection, combinedFilterRequest);
    typia.assert(combinedResponse);
    // Verify data integrity of returned guests
    for (const guest of combinedResponse.data) {
        // Verify required fields exist
        TestValidator.predicate(`guest ${guest.id} has valid UUID`, typeof guest.id === "string");
        TestValidator.predicate(`guest ${guest.id} has device_fingerprint`, typeof guest.device_fingerprint === "string");
        TestValidator.predicate(`guest ${guest.id} has created_at`, typeof guest.created_at === "string");
        TestValidator.predicate(`guest ${guest.id} has updated_at`, typeof guest.updated_at === "string");
        TestValidator.predicate(`guest ${guest.id} has non-negative session_count`, guest.session_count >= 0);

        // Verify timestamps are within the requested range (for created_at)
        const guestCreatedAt = new Date(guest.created_at);
        TestValidator.predicate(
            `guest ${guest.id} created_at is within range`,
            guestCreatedAt >= sevenDaysAgo && guestCreatedAt <= now,
        );
    }

    // Test 7: Pagination validation - verify page and limit work correctly
    const paginatedRequest = {
        body: {
            createdAtFrom: thirtyDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            page: 1,
            limit: 5,
        } satisfies IRedditLikeGuest.IRequest,
    };

    const paginatedResponse = await api.functional.redditLike.guests.index(
        connection,
        paginatedRequest,
    );
    typia.assert(paginatedResponse);

    TestValidator.equals("pagination limit matches request", paginatedResponse.pagination.limit, 5);
    TestValidator.equals("pagination current matches request", paginatedResponse.pagination.current, 1);
    TestValidator.predicate("data length does not exceed limit", paginatedResponse.data.length <= 5);
}