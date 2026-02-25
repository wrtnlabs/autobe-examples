import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteScore";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test the admin post vote scores endpoint with comprehensive filtering capabilities.
 * Validate that the system correctly filters posts based on score ranges (minimum/maximum total scores),
 * upvote/downvote counts, and date ranges. Verify that pagination works correctly with different
 * page sizes and that the response includes accurate vote statistics including upvote_count,
 * downvote_count, total_score, and timestamps.
 */
export async function test_api_admin_posts_vote_scores_filtering_by_score_ranges(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            permissions_level: null,
        } satisfies ICommunityPlatformAdmin.IJoin,
    });
    // 2. Test filtering by minimum total score (high engagement posts)
    const minScore = typia.random<number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>>();
    const highEngagementResponse = await api.functional.communityPlatform.admin.posts.vote_scores.index(adminConnection, {
        body: {
            min_total_score: minScore,
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>>(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
    });
    typia.assert(highEngagementResponse);
    // 3. Test filtering by maximum total score (low engagement posts)
    const maxScore = typia.random<number & tags.Type<"int32"> & tags.Minimum<-100> & tags.Maximum<-1>>();
    const lowEngagementResponse = await api.functional.communityPlatform.admin.posts.vote_scores.index(adminConnection, {
        body: {
            max_total_score: maxScore,
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>>(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
    });
    typia.assert(lowEngagementResponse);
    // 4. Test filtering by score range (specific score band)
    const rangeMin = typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>>();
    const rangeMax = typia.random<number & tags.Type<"int32"> & tags.Minimum<11> & tags.Maximum<50>>();
    const scoreRangeResponse = await api.functional.communityPlatform.admin.posts.vote_scores.index(adminConnection, {
        body: {
            min_total_score: rangeMin,
            max_total_score: rangeMax,
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>>(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
    });
    typia.assert(scoreRangeResponse);
    // 5. Test pagination with different page sizes
    const paginationResponse = await api.functional.communityPlatform.admin.posts.vote_scores.index(adminConnection, {
        body: {
            page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>>(),
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>>(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
    });
    typia.assert(paginationResponse);
    // 6. Test date range filtering
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const dateRangeResponse = await api.functional.communityPlatform.admin.posts.vote_scores.index(adminConnection, {
        body: {
            start_last_updated_at: oneWeekAgo,
            end_last_updated_at: now,
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>>(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
    });
    typia.assert(dateRangeResponse);
    // 7. Test combined filtering with upvote/downvote counts
    const combinedResponse = await api.functional.communityPlatform.admin.posts.vote_scores.index(adminConnection, {
        body: {
            min_upvote_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>>(),
            max_downvote_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>>(),
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>>(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
    });
    typia.assert(combinedResponse);
    // 8. Validate pagination metadata structure
    TestValidator.predicate("pagination has valid current page", paginationResponse.pagination.current >= 1);
    TestValidator.predicate("pagination has positive limit", paginationResponse.pagination.limit > 0);
    TestValidator.predicate("pagination has non-negative records count", paginationResponse.pagination.records >= 0);
    TestValidator.predicate("pagination has non-negative pages count", paginationResponse.pagination.pages >= 0);
    // 9. Validate that high engagement filter returns posts with scores >= min threshold
    if (highEngagementResponse.data.length > 0) {
        const sampleItem = highEngagementResponse.data[0];
        TestValidator.predicate("high engagement item meets min score threshold", sampleItem.total_score >= minScore);
    }
    // 10. Validate that low engagement filter returns posts with scores <= max threshold
    if (lowEngagementResponse.data.length > 0) {
        const sampleItem = lowEngagementResponse.data[0];
        TestValidator.predicate("low engagement item meets max score threshold", sampleItem.total_score <= maxScore);
    }
    // 11. Validate that score range filter returns posts within specified range
    if (scoreRangeResponse.data.length > 0) {
        const sampleItem = scoreRangeResponse.data[0];
        TestValidator.predicate("score range item is within bounds", sampleItem.total_score >= rangeMin && sampleItem.total_score <= rangeMax);
    }
}