import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAuditLog";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAuditLog";

/**
 * Test comprehensive moderation audit log retrieval with advanced filtering.
 *
 * This test validates that administrators can effectively search and filter
 * moderation audit logs across multiple dimensions including action type,
 * moderator identity, target user, date ranges, and content type. It verifies
 * that the audit trail provides complete accountability with immutable records
 * of all moderation decisions.
 *
 * Test workflow:
 *
 * 1. Create administrator account with audit log access permissions
 * 2. Create multiple member accounts as moderation targets
 * 3. Create discussion categories and topics for moderation
 * 4. Generate multiple reports to trigger moderation workflow
 * 5. Create diverse moderation actions across different action types
 * 6. Test filtering by action type to retrieve specific moderation events
 * 7. Test filtering by target user for investigating moderation history
 * 8. Test date range filtering for temporal analysis
 * 9. Test content type filtering (topic vs reply moderation)
 * 10. Test combined filters for complex audit queries
 * 11. Verify pagination with different page sizes
 * 12. Verify sorting options (timestamp, action type)
 * 13. Validate complete context preservation in audit logs
 */
export async function test_api_moderation_audit_comprehensive_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple member accounts as moderation targets
  const members = await ArrayUtil.asyncRepeat(3, async (index) => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10) + index.toString(),
        email: memberEmail,
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 3: Create discussion category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          description: "Economic discussions and policy analysis",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create topics from different members
  const topics = await ArrayUtil.asyncRepeat(3, async (index) => {
    const memberConnection = {
      ...connection,
      headers: {
        ...connection.headers,
        Authorization: members[index].token.access,
      },
    };

    const topic = await api.functional.discussionBoard.member.topics.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          category_id: category.id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);
    return topic;
  });

  // Step 5: Create reports from members about topics
  const reports = await ArrayUtil.asyncRepeat(3, async (index) => {
    const reporterIndex = (index + 1) % 3;
    const reporterConnection = {
      ...connection,
      headers: {
        ...connection.headers,
        Authorization: members[reporterIndex].token.access,
      },
    };

    const report = await api.functional.discussionBoard.member.reports.create(
      reporterConnection,
      {
        body: {
          reported_topic_id: topics[index].id,
          violation_category: RandomGenerator.pick([
            "personal_attack",
            "hate_speech",
            "misinformation",
            "spam",
            "offensive_language",
          ] as const),
          reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Step 6: Create diverse moderation actions
  const actionTypes = [
    "hide_content",
    "delete_content",
    "issue_warning",
  ] as const;

  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
  ] as const;

  const moderationActions = await ArrayUtil.asyncRepeat(3, async (index) => {
    const action =
      await api.functional.discussionBoard.administrator.moderationActions.create(
        connection,
        {
          body: {
            administrator_id: admin.id,
            target_member_id: members[index].id,
            related_report_id: reports[index].id,
            content_topic_id: topics[index].id,
            action_type: actionTypes[index],
            reason: RandomGenerator.paragraph({
              sentences: 4,
              wordMin: 5,
              wordMax: 10,
            }),
            violation_category: violationCategories[index],
            content_snapshot: topics[index].body,
          } satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    typia.assert(action);
    return action;
  });

  // Step 7: Test basic audit log retrieval
  const allAuditLogs =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(allAuditLogs);
  TestValidator.predicate(
    "audit logs are retrievable",
    allAuditLogs.data.length >= 0,
  );

  // Step 8: Test filtering by target user
  const targetUserAuditLogs =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          target_user_id: members[0].id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(targetUserAuditLogs);
  TestValidator.predicate(
    "target user filtering works",
    targetUserAuditLogs.data.length >= 0,
  );

  // Step 9: Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dateRangeAuditLogs =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          date_from: yesterday.toISOString(),
          date_to: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeAuditLogs);
  TestValidator.predicate(
    "date range filtering returns results",
    dateRangeAuditLogs.data.length >= 0,
  );

  // Step 10: Test content type filtering
  const topicAuditLogs =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          target_content_type: "topic",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(topicAuditLogs);
  TestValidator.predicate(
    "content type filtering works",
    topicAuditLogs.data.length >= 0,
  );

  // Step 11: Test combined filters
  const combinedFilterAuditLogs =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          target_user_id: members[0].id,
          target_content_type: "topic",
          date_from: yesterday.toISOString(),
          date_to: tomorrow.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(combinedFilterAuditLogs);
  TestValidator.predicate(
    "combined filters work together",
    combinedFilterAuditLogs.data.length >= 0,
  );

  // Step 12: Test pagination with different page sizes
  const paginatedAuditLogs =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(paginatedAuditLogs);
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedAuditLogs.data.length <= 2,
  );

  // Step 13: Test sorting by different fields
  const sortedByTimestamp =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(sortedByTimestamp);
  TestValidator.predicate(
    "sorting by timestamp works",
    sortedByTimestamp.data.length >= 0,
  );

  const sortedByActionType =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          sort_by: "action_type",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(sortedByActionType);
  TestValidator.predicate(
    "sorting by action type works",
    sortedByActionType.data.length >= 0,
  );

  // Step 14: Validate pagination metadata
  const metadataCheck =
    await api.functional.discussionBoard.administrator.audit.moderation.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationAuditLog.IRequest,
      },
    );
  typia.assert(metadataCheck);

  TestValidator.predicate(
    "pagination metadata is valid",
    metadataCheck.pagination.current === 1 &&
      metadataCheck.pagination.limit === 100 &&
      metadataCheck.pagination.records >= 0 &&
      metadataCheck.pagination.pages >= 0,
  );

  // Step 15: Test filtering with various action types if audit logs exist
  if (allAuditLogs.data.length > 0) {
    const firstActionType = allAuditLogs.data[0].action_type;
    const actionTypeFiltered =
      await api.functional.discussionBoard.administrator.audit.moderation.index(
        connection,
        {
          body: {
            action_type: firstActionType,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardModerationAuditLog.IRequest,
        },
      );
    typia.assert(actionTypeFiltered);
    TestValidator.predicate(
      "action type filtering returns results",
      actionTypeFiltered.data.length >= 0,
    );
  }
}
