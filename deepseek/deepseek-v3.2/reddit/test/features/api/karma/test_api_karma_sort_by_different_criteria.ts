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
/**
 * Test sorting karma records by various criteria: score-asc (lowest to highest), score-desc (highest to lowest),
 * created_at-asc (oldest first), created_at-desc (newest first), updated_at-asc (least recently updated),
 * updated_at-desc (most recently updated).
 */
export async function test_api_karma_sort_by_different_criteria(connection: api.IConnection): Promise<void> {
    // 1. Create guest connection
    const guestConnection: api.IConnection = { host: connection.host };
    await authorize_guest_join(guestConnection, {
        body: {
            anonymous_id: typia.random<string & tags.Format<"uuid">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformGuest.IJoin,
    });
    // 2. Test default sorting (score-desc)
    const defaultPage = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(defaultPage);
    // Verify default sorting by checking first two items if available
    if (defaultPage.data.length >= 2) {
        TestValidator.predicate("default sorting should be score-desc (highest first)", defaultPage.data[0].score >= defaultPage.data[1].score);
    }
    // 3. Test score-asc (lowest to highest)
    const scoreAscPage = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            sort: "score-asc" as const,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(scoreAscPage);
    // Validate ascending score order
    for (let i = 1; i < scoreAscPage.data.length; i++) {
        TestValidator.predicate(`score-asc: item ${i} should have score >= previous`, scoreAscPage.data[i].score >= scoreAscPage.data[i - 1].score);
    }
    // 4. Test score-desc (highest to lowest)
    const scoreDescPage = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            sort: "score-desc" as const,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(scoreDescPage);
    // Validate descending score order
    for (let i = 1; i < scoreDescPage.data.length; i++) {
        TestValidator.predicate(`score-desc: item ${i} should have score <= previous`, scoreDescPage.data[i].score <= scoreDescPage.data[i - 1].score);
    }
    // 5. Test created_at-asc (oldest first)
    const createdAscPage = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            sort: "created_at-asc" as const,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(createdAscPage);
    // Validate ascending creation time order
    for (let i = 1; i < createdAscPage.data.length; i++) {
        TestValidator.predicate(`created_at-asc: item ${i} should be created at or after previous`, new Date(createdAscPage.data[i].created_at).getTime() >=
            new Date(createdAscPage.data[i - 1].created_at).getTime());
    }
    // 6. Test created_at-desc (newest first)
    const createdDescPage = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            sort: "created_at-desc" as const,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(createdDescPage);
    // Validate descending creation time order
    for (let i = 1; i < createdDescPage.data.length; i++) {
        TestValidator.predicate(`created_at-desc: item ${i} should be created at or before previous`, new Date(createdDescPage.data[i].created_at).getTime() <=
            new Date(createdDescPage.data[i - 1].created_at).getTime());
    }
    // 7. Test updated_at-asc (least recently updated)
    const updatedAscPage = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            sort: "updated_at-asc" as const,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(updatedAscPage);
    // Validate ascending update time order
    for (let i = 1; i < updatedAscPage.data.length; i++) {
        TestValidator.predicate(`updated_at-asc: item ${i} should be updated at or after previous`, new Date(updatedAscPage.data[i].updated_at).getTime() >=
            new Date(updatedAscPage.data[i - 1].updated_at).getTime());
    }
    // 8. Test updated_at-desc (most recently updated)
    const updatedDescPage = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            sort: "updated_at-desc" as const,
            limit: 100,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(updatedDescPage);
    // Validate descending update time order
    for (let i = 1; i < updatedDescPage.data.length; i++) {
        TestValidator.predicate(`updated_at-desc: item ${i} should be updated at or before previous`, new Date(updatedDescPage.data[i].updated_at).getTime() <=
            new Date(updatedDescPage.data[i - 1].updated_at).getTime());
    }
    // 9. Test pagination maintains sort order across pages
    const paginationTest = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
        body: {
            sort: "score-desc" as const,
            limit: 10,
            page: 1,
        } satisfies ICommunityPlatformKarma.IRequest,
    });
    typia.assert(paginationTest);
    // If there are multiple pages, test second page
    if (paginationTest.pagination.pages > 1) {
        const secondPage = await api.functional.communityPlatform.guest.karmas.index(guestConnection, {
            body: {
                sort: "score-desc" as const,
                limit: 10,
                page: 2,
            } satisfies ICommunityPlatformKarma.IRequest,
        });
        typia.assert(secondPage);
        // Validate that all items on page 2 have scores <= last item on page 1
        if (paginationTest.data.length > 0 && secondPage.data.length > 0) {
            const lastScorePage1 = paginationTest.data[paginationTest.data.length - 1].score;
            for (const karma of secondPage.data) {
                TestValidator.predicate("pagination: page 2 scores should be <= last score on page 1", karma.score <= lastScorePage1);
            }
        }
    }
}