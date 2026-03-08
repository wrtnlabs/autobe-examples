import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_banned_users_list(connection: api.IConnection): Promise<void> {
    // 1. Create admin user 1 (will be used for banning and list operations)
    const admin1Connection: api.IConnection = { host: connection.host };
    const admin1Auth = await authorize_admin_join(admin1Connection, {
        body: {
            email: RandomGenerator.alphaNumeric(10) + "@test.com",
            password: RandomGenerator.alphaNumeric(16),
            href: "http://test.example.com",
            referrer: "http://test.example.com/referrer",
        },
    });
    typia.assert(admin1Auth);
    // 2. Create admin user 2 (will be used for testing admin-to-admin operations)
    const admin2Connection: api.IConnection = { host: connection.host };
    const admin2Auth = await authorize_admin_join(admin2Connection, {
        body: {
            email: RandomGenerator.alphaNumeric(10) + "@test.com",
            password: RandomGenerator.alphaNumeric(16),
            href: "http://test.example.com",
            referrer: "http://test.example.com/referrer",
        },
    });
    typia.assert(admin2Auth);
    // 3. Test default sorting (created_at descending) with empty state handling
    const defaultSortResult = await api.functional.economicPoliticalBoard.admin.banned_users.index(admin1Connection, { body: {} });
    typia.assert(defaultSortResult);
    // Validate pagination structure
    TestValidator.equals("pagination has current page 1", defaultSortResult.pagination.current, 1);
    TestValidator.predicate("pagination has positive limit", defaultSortResult.pagination.limit > 0);
    TestValidator.predicate("pagination records is non-negative", defaultSortResult.pagination.records >= 0);
    TestValidator.predicate("pagination pages is non-negative", defaultSortResult.pagination.pages >= 0);
    // 4. Validate response data structure when data exists
    if (defaultSortResult.data.length > 0) {
        const firstBan = defaultSortResult.data[0];
        // Verify ban record fields exist
        TestValidator.notEquals("ban has id", firstBan.id, undefined);
        TestValidator.notEquals("ban has user_id", firstBan.user_id, undefined);
        TestValidator.notEquals("ban has banned_by_admin_id", firstBan.banned_by_admin_id, undefined);
        TestValidator.notEquals("ban has reason", firstBan.reason, undefined);
        TestValidator.notEquals("ban has created_at", firstBan.created_at, undefined);
        // Verify joined user information (ISummary only has id, not email/displayName/bio)
        TestValidator.notEquals("user has id", firstBan.user.id, undefined);
        // Verify joined banning admin information
        TestValidator.notEquals("bannedByAdmin has id", firstBan.bannedByAdmin.id, undefined);
        TestValidator.notEquals("bannedByAdmin has userId", firstBan.bannedByAdmin.userId, undefined);
        TestValidator.notEquals("bannedByAdmin has grade", firstBan.bannedByAdmin.grade, undefined);
        // Verify default sorting is created_at descending
        if (defaultSortResult.data.length >= 2) {
            const createdAt0 = new Date(defaultSortResult.data[0].created_at);
            const createdAt1 = new Date(defaultSortResult.data[1].created_at);
            TestValidator.predicate("results sorted by created_at descending (most recent first)", createdAt0 >= createdAt1);
        }
    }
    // 5. Test pagination (page=2, pageSize=5)
    const paginatedResult = await api.functional.economicPoliticalBoard.admin.banned_users.index(admin1Connection, { body: { page: 2, pageSize: 5 } });
    typia.assert(paginatedResult);
    TestValidator.equals("pagination current page is 2", paginatedResult.pagination.current, 2);
    TestValidator.equals("pagination limit is 5", paginatedResult.pagination.limit, 5);
    // 6. Test date range filter
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const dateFilteredResult = await api.functional.economicPoliticalBoard.admin.banned_users.index(admin1Connection, {
        body: {
            dateFrom: threeDaysAgo.toISOString(),
            dateTo: new Date().toISOString(),
        },
    });
    typia.assert(dateFilteredResult);
    TestValidator.equals("date filtered pagination current page", dateFilteredResult.pagination.current, 1);
    // 7. Test reason keywords filter
    const reasonKeywordsResult = await api.functional.economicPoliticalBoard.admin.banned_users.index(admin1Connection, { body: { reasonKeywords: "violation" } });
    typia.assert(reasonKeywordsResult);
    TestValidator.equals("reason keywords filtered pagination current page", reasonKeywordsResult.pagination.current, 1);
    // 8. Test custom sorting (sortBy=user_id, sortOrder=asc)
    const customSortResult = await api.functional.economicPoliticalBoard.admin.banned_users.index(admin1Connection, { body: { sortBy: "user_id", sortOrder: "asc" } });
    typia.assert(customSortResult);
    TestValidator.equals("custom sort pagination current page", customSortResult.pagination.current, 1);
    // 9. Test custom sorting (sortBy=banned_by_admin_id, sortOrder=desc)
    const adminSortResult = await api.functional.economicPoliticalBoard.admin.banned_users.index(admin1Connection, { body: { sortBy: "banned_by_admin_id", sortOrder: "desc" } });
    typia.assert(adminSortResult);
    TestValidator.equals("admin sort pagination current page", adminSortResult.pagination.current, 1);
    // 10. Verify ban record completeness - all records should have joined data
    if (defaultSortResult.data.length > 0) {
        for (const ban of defaultSortResult.data) {
            // Each ban should have banning admin information
            TestValidator.notEquals(`ban ${ban.id} has bannedByAdmin`, ban.bannedByAdmin, undefined);
        }
    }
    // 11. Test that all ban records are visible to admin (no personal info filtered)
    if (defaultSortResult.data.length > 0) {
        TestValidator.predicate("ban list contains complete information", defaultSortResult.data.some((ban) => ban.reason && ban.reason.length > 0));
    }
}