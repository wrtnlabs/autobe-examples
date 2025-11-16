import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test sorting moderation audit logs by action_type.
 *
 * This test validates that the audit log API correctly sorts results by
 * action_type, grouping similar moderation actions together (e.g., all post
 * removals together, all user suspensions together). This enables pattern
 * analysis across similar moderation actions and helps identify trends in
 * moderator behavior.
 *
 * Test flow:
 *
 * 1. Create moderator account for audit log access
 * 2. Retrieve audit logs sorted by action_type in ascending order
 * 3. Retrieve audit logs sorted by action_type in descending order
 * 4. Verify that logs are properly grouped by action_type
 * 5. Test combining action_type sort with target_type filter
 * 6. Validate pagination with sorting
 */
export async function test_api_moderation_audit_logs_sorting_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve audit logs sorted by action_type ascending
  const logsAscending: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "action_type",
          order: "asc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(logsAscending);

  // Validate that logs are present and properly structured
  TestValidator.predicate(
    "ascending sorted logs should be retrieved",
    logsAscending.data.length > 0 || logsAscending.pagination.records === 0,
  );

  // Step 3: Retrieve audit logs sorted by action_type descending
  const logsDescending: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "action_type",
          order: "desc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(logsDescending);

  // Step 4: Verify action_type grouping in ascending sort
  if (logsAscending.data.length >= 2) {
    // Check that action_types are in consistent order (grouped)
    const actionTypes: string[] = logsAscending.data.map(
      (log) => log.action_type,
    );

    // Verify sorting by checking if action_types follow alphabetical order
    let isProperlyGrouped = true;
    for (let i = 1; i < actionTypes.length; i++) {
      if (actionTypes[i] < actionTypes[i - 1]) {
        isProperlyGrouped = false;
        break;
      }
    }

    TestValidator.predicate(
      "action_types should be grouped in ascending order",
      isProperlyGrouped || logsAscending.data.length <= 1,
    );
  }

  // Step 5: Test combining action_type sort with target_type filter
  const targetTypes = ["post", "comment", "user"] as const;
  const selectedTargetType = RandomGenerator.pick(targetTypes);

  const filteredAndSorted: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 30,
          target_type: selectedTargetType,
          sort_by: "action_type",
          order: "asc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(filteredAndSorted);

  // Verify all returned logs match the target_type filter
  if (filteredAndSorted.data.length > 0) {
    TestValidator.predicate(
      "all filtered logs should match selected target_type",
      filteredAndSorted.data.every(
        (log) => log.target_type === selectedTargetType,
      ),
    );
  }

  // Step 6: Validate pagination with sorting
  const paginatedSorted: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "action_type",
          order: "asc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(paginatedSorted);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedSorted.data.length <= 10,
  );

  TestValidator.predicate(
    "pagination info should be valid",
    paginatedSorted.pagination.current >= 1 &&
      paginatedSorted.pagination.limit > 0,
  );
}
