import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_post_search_sorting(connection: api.IConnection): Promise<void> {
    // 1. Create guest session for unauthenticated access
    const guestConnection: api.IConnection = { host: connection.host };
    const guestAuth = await authorize_guest_join(guestConnection, {
        body: {
            fingerprint: typia.random<string>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformGuest.IJoin,
    });
    typia.assert(guestAuth);
    // 2. Create test posts with various engagement levels and timestamps
    const testPosts = ArrayUtil.repeat(10, (index: number) => {
        const now = new Date();
        const createdAt = new Date(now.getTime() - index * 3600000); // 1 hour apart
        const upvotes = typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>();
        const downvotes = typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>();
        return {
            id: typia.random<string & tags.Format<"uuid">>(),
            title: `Test Post ${index + 1}`,
            post_type: (["text", "link", "image"] as const)[index % 3],
            upvotes_count: upvotes,
            downvotes_count: downvotes,
            comment_count: typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>() satisfies number as number,
            author: {
                id: typia.random<string & tags.Format<"uuid">>(),
                username: `user_${index}`,
                karma: typia.random<number & tags.Type<"int32">>(),
                created_at: createdAt.toISOString(),
            } satisfies IRedditPlatformMember.ISummary,
            community: {
                id: typia.random<string & tags.Format<"uuid">>(),
                name: "test_community",
                description: null,
                icon_url: null,
                subscriber_count: typia.random<number & tags.Type<"uint32">>() satisfies number as number,
                owner: {
                    id: typia.random<string & tags.Format<"uuid">>(),
                    username: "admin",
                    karma: typia.random<number & tags.Type<"int32">>(),
                    created_at: createdAt.toISOString(),
                } satisfies IRedditPlatformMember.ISummary,
                created_at: createdAt.toISOString(),
                updated_at: createdAt.toISOString(),
                deleted_at: null,
            } satisfies IRedditPlatformCommunity.ISummary,
            created_at: createdAt.toISOString(),
            updated_at: createdAt.toISOString(),
            deleted_at: null,
        } satisfies IRedditPlatformPost.ISummary;
    });
    // 3. Test 'new' sorting - should be ordered by created_at DESC
    const newSortRequest = {
        sort: "new" as const,
        limit: 10,
        page: 1,
    } satisfies IRedditPlatformPost.ISearchRequest;
    const newSortResponse = await api.functional.redditPlatform.guest.search.posts.index(guestConnection, { body: newSortRequest });
    typia.assert(newSortResponse);
    TestValidator.equals("new sort - current page", newSortResponse.pagination.current, 1);
    TestValidator.equals("new sort - limit", newSortResponse.pagination.limit, 10);
    TestValidator.predicate("new sort - records match pagination", newSortResponse.pagination.records === testPosts.length);
    // Verify posts are ordered by created_at DESC
    for (let i = 1; i < newSortResponse.data.length; i++) {
        const prevCreated = new Date(newSortResponse.data[i - 1].created_at).getTime();
        const currCreated = new Date(newSortResponse.data[i].created_at).getTime();
        TestValidator.predicate(`new sort - post ${i} is older than ${i - 1}`, prevCreated >= currCreated);
    }
    // 4. Test 'hot' sorting - weighted combination of score and recency
    const hotSortRequest = {
        sort: "hot" as const,
        limit: 10,
        page: 1,
    } satisfies IRedditPlatformPost.ISearchRequest;
    const hotSortResponse = await api.functional.redditPlatform.guest.search.posts.index(guestConnection, { body: hotSortRequest });
    typia.assert(hotSortResponse);
    TestValidator.equals("hot sort - current page", hotSortResponse.pagination.current, 1);
    TestValidator.predicate("hot sort - pagination metadata accurate", hotSortResponse.pagination.pages >= 1 && hotSortResponse.pagination.pages > 0);
    // 5. Test 'top' sorting with 'today' time range
    const topSortRequest = {
        sort: "top" as const,
        top_time_range: "today" as const,
        limit: 10,
        page: 1,
    } satisfies IRedditPlatformPost.ISearchRequest;
    const topSortResponse = await api.functional.redditPlatform.guest.search.posts.index(guestConnection, { body: topSortRequest });
    typia.assert(topSortResponse);
    TestValidator.equals("top sort - current page", topSortResponse.pagination.current, 1);
    TestValidator.predicate("top sort - has correct pagination", topSortResponse.pagination.records >= 0 && topSortResponse.pagination.pages >= 0);
    // Verify posts have reasonable scores for top sorting
    for (const post of topSortResponse.data) {
        TestValidator.predicate("top sort - upvotes non-negative", post.upvotes_count >= 0);
        TestValidator.predicate("top sort - downvotes non-negative", post.downvotes_count >= 0);
    }
    // 6. Test 'controversial' sorting - most balanced upvote/downvote ratios
    const controversialSortRequest = {
        sort: "controversial" as const,
        limit: 10,
        page: 1,
    } satisfies IRedditPlatformPost.ISearchRequest;
    const controversialSortResponse = await api.functional.redditPlatform.guest.search.posts.index(guestConnection, { body: controversialSortRequest });
    typia.assert(controversialSortResponse);
    TestValidator.equals("controversial sort - current page", controversialSortResponse.pagination.current, 1);
    TestValidator.predicate("controversial sort - pagination accurate", controversialSortResponse.pagination.records >= 0 && controversialSortResponse.pagination.pages >= 0);
    // 7. Validate post summary structure for all responses
    for (const response of [newSortResponse, hotSortResponse, topSortResponse, controversialSortResponse]) {
        for (const post of response.data) {
            TestValidator.predicate("post - has valid id", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post.id));
            TestValidator.predicate("post - title is string", typeof post.title === "string");
            TestValidator.predicate("post - valid post_type", ["text", "link", "image"].includes(post.post_type));
            TestValidator.predicate("post - upvotes is int32", Number.isInteger(post.upvotes_count));
            TestValidator.predicate("post - downvotes is int32", Number.isInteger(post.downvotes_count));
            TestValidator.predicate("post - comment_count is int32", Number.isInteger(post.comment_count));
            TestValidator.predicate("post - author exists", post.author !== null && post.author !== undefined);
            TestValidator.predicate("post - community exists", post.community !== null && post.community !== undefined);
            TestValidator.predicate("post - created_at is valid date", !isNaN(new Date(post.created_at).getTime()));
            TestValidator.predicate("post - updated_at is valid date", !isNaN(new Date(post.updated_at).getTime()));
            TestValidator.predicate("post - deleted_at is null for active", post.deleted_at === null);
            // Validate author structure
            TestValidator.predicate("author - has valid id", post.author.id !== undefined);
            TestValidator.predicate("author - username exists", typeof post.author.username === "string");
            TestValidator.predicate("author - karma is int32", Number.isInteger(post.author.karma));
            TestValidator.predicate("author - created_at is valid", !isNaN(new Date(post.author.created_at).getTime()));
            // Validate community structure
            TestValidator.predicate("community - has valid id", post.community.id !== undefined);
            TestValidator.predicate("community - name exists", typeof post.community.name === "string");
            TestValidator.predicate("community - owner exists", post.community.owner !== null && post.community.owner !== undefined);
        }
    }
    // 8. Test pagination boundary enforcement (limit max 100)
    const highLimitRequest = {
        sort: "new" as const,
        limit: 1000,
        page: 1,
    } satisfies IRedditPlatformPost.ISearchRequest;
    const highLimitResponse = await api.functional.redditPlatform.guest.search.posts.index(guestConnection, { body: highLimitRequest });
    typia.assert(highLimitResponse);
    TestValidator.equals("high limit - capped at 100", highLimitResponse.pagination.limit, 100);
    // 9. Test empty result set scenario (filter with non-matching search term)
    const emptyResultRequest = {
        sort: "new" as const,
        search: "NONEXISTENTPOSTTYPE12345",
        limit: 10,
        page: 1,
    } satisfies IRedditPlatformPost.ISearchRequest;
    const emptyResultResponse = await api.functional.redditPlatform.guest.search.posts.index(guestConnection, { body: emptyResultRequest });
    typia.assert(emptyResultResponse);
    TestValidator.equals("empty result - no records", emptyResultResponse.pagination.records, 0);
    TestValidator.equals("empty result - zero pages", emptyResultResponse.pagination.pages, 0);
    TestValidator.equals("empty result - no data", emptyResultResponse.data.length, 0);
}