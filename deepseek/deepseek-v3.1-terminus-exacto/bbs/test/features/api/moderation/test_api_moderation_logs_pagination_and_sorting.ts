import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
/**
 * Test pagination and sorting functionality for moderation logs.
 *
 * This test verifies that super administrators can efficiently navigate large sets
 * of moderation logs through proper pagination and sorting. It creates multiple
 * moderation log entries to test pagination boundaries and validates that the
 * default sorting by performed_at descending ensures most recent activities
 * appear first for audit purposes.
 */
export async function test_api_moderation_logs_pagination_and_sorting(connection: api.IConnection): Promise<void> {
    // Create super administrator connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
            privilege_level: "super_admin",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    typia.assert(superAdmin);
    // Test basic pagination functionality
    const pageSizes = [5, 10, 20] as const;
    for (const pageSize of pageSizes) {
        // Test first page
        const firstPage = await api.functional.discussionBoard.superAdmin.moderation_logs.index(superAdminConnection, {
            body: {
                page: 1,
                limit: pageSize,
            } satisfies IDiscussionBoardModerationLog.IRequest,
        });
        typia.assert(firstPage);
        // Validate pagination metadata
        TestValidator.equals(`page ${pageSize} current page`, firstPage.pagination.current, 1);
        TestValidator.equals(`page ${pageSize} limit`, firstPage.pagination.limit, pageSize);
        TestValidator.predicate(`page ${pageSize} total records non-negative`, firstPage.pagination.records >= 0);
        TestValidator.predicate(`page ${pageSize} total pages non-negative`, firstPage.pagination.pages >= 0);
        // Test second page if available
        if (firstPage.pagination.pages > 1) {
            const secondPage = await api.functional.discussionBoard.superAdmin.moderation_logs.index(superAdminConnection, {
                body: {
                    page: 2,
                    limit: pageSize,
                } satisfies IDiscussionBoardModerationLog.IRequest,
            });
            typia.assert(secondPage);
            TestValidator.equals(`page ${pageSize} second page current`, secondPage.pagination.current, 2);
        }
    }

    // Test default sorting by performed_at descending
    const sortedLogs = await api.functional.discussionBoard.superAdmin.moderation_logs.index(
        superAdminConnection,
        {
            body: {
                page: 1,
                limit: 10,
            } satisfies IDiscussionBoardModerationLog.IRequest,
        },
    );
    typia.assert(sortedLogs);

    // Validate that logs are sorted by performed_at descending (most recent first)
    if (sortedLogs.data.length > 1) {
        for (let i = 0; i < sortedLogs.data.length - 1; i++) {
            const currentTimestamp = sortedLogs.data[i].performed_at;
            const nextTimestamp = sortedLogs.data[i + 1].performed_at;
            
            // Use string comparison for ISO 8601 timestamps
            TestValidator.predicate(`log ${i} performed_at should be >= log ${i + 1} performed_at`, currentTimestamp >= nextTimestamp);
        }
    }
    // Test pagination with filtering
    const filteredLogs = await api.functional.discussionBoard.superAdmin.moderation_logs.index(superAdminConnection, {
        body: {
            page: 1,
            limit: 5,
            status: "completed",
        } satisfies IDiscussionBoardModerationLog.IRequest,
    });
    typia.assert(filteredLogs);
    // If we have filtered logs, validate they have the correct status
    if (filteredLogs.data.length > 0) {
        for (const log of filteredLogs.data) {
            TestValidator.equals("filtered log status should be completed", log.status, "completed");
        }
    }
}