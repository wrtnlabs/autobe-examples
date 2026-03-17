import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_karma_filter_by_score_range(connection: api.IConnection): Promise<void> {
    // Create guest connection for authentication
    const guestConnection: api.IConnection = { host: connection.host };
    await authorize_guest_join(guestConnection, {
        body: {
            anonymous_id: typia.random<string & tags.Format<"uuid">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    // Get baseline karma records without filters
    const baseline = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            limit: 100,
            sort: "score-desc",
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(baseline);
    // Only proceed if we have karma records to test
    if (baseline.data.length === 0) {
        return;
    }
    // Find min and max scores from baseline
    const scores = baseline.data.map((karma) => karma.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    // Test 1: Filter with range covering all scores
    const testRangeAll = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            min_score: minScore satisfies number as number,
            max_score: maxScore satisfies number as number,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(testRangeAll);
    TestValidator.predicate("range covering all should return same count", testRangeAll.data.length === baseline.data.length);
    // Test 2: Filter with mid-range (if possible)
    const midPoint = Math.floor((minScore + maxScore) / 2);
    if (minScore < midPoint && midPoint < maxScore) {
        const midMin = Math.floor(midPoint) - 5;
        const midMax = Math.floor(midPoint) + 5;
        const testMidRange = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
            body: {
                min_score: midMin satisfies number as number,
                max_score: midMax satisfies number as number,
                limit: 100,
            } satisfies ICommunityPlatformKarma.IRequest,
        });
        typia.assert(testMidRange);
        TestValidator.predicate("mid-range filter should only include scores in range", testMidRange.data.every((karma) => karma.score >= midMin && karma.score <= midMax));
    }
    // Test 3: Filter with only min_score (open-ended upper range)
    const testMinOnly = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            min_score: Math.floor(midPoint) satisfies number as number,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(testMinOnly);
    TestValidator.predicate("min_score filter should only include scores >= threshold", testMinOnly.data.every((karma) => karma.score >= Math.floor(midPoint)));
    // Test 4: Filter with only max_score (open-ended lower range)
    const testMaxOnly = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            max_score: Math.floor(midPoint) satisfies number as number,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(testMaxOnly);
    TestValidator.predicate("max_score filter should only include scores <= threshold", testMaxOnly.data.every((karma) => karma.score <= Math.floor(midPoint)));
    // Test 5: Zero boundary if zero score exists
    const zeroScoreExists = scores.some((score) => score === 0);
    if (zeroScoreExists) {
        const testZeroRange = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
            body: {
                min_score: 0 satisfies number as number,
                max_score: 0 satisfies number as number,
                limit: 100,
            } satisfies ICommunityPlatformKarma.IRequest,
        });
        typia.assert(testZeroRange);
        TestValidator.predicate("zero range filter should only include scores exactly zero", testZeroRange.data.every((karma) => karma.score === 0));
    }
    // Test 6: Negative range if negative scores exist
    const negativeScoresExist = scores.some((score) => score < 0);
    if (negativeScoresExist) {
        const testNegativeRange = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
            body: {
                min_score: -100 satisfies number as number,
                max_score: -1 satisfies number as number,
                limit: 100,
            } satisfies ICommunityPlatformKarma.IRequest,
        });
        typia.assert(testNegativeRange);
        TestValidator.predicate("negative range filter should only include negative scores", testNegativeRange.data.every((karma) => karma.score < 0));
    }
    // Test 7: Positive range if positive scores exist
    const positiveScoresExist = scores.some((score) => score > 0);
    if (positiveScoresExist) {
        const testPositiveRange = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
            body: {
                min_score: 1 satisfies number as number,
                max_score: maxScore satisfies number as number,
                limit: 100,
            } satisfies ICommunityPlatformKarma.IRequest,
        });
        typia.assert(testPositiveRange);
        TestValidator.predicate("positive range filter should only include positive scores", testPositiveRange.data.every((karma) => karma.score > 0));
    }
}