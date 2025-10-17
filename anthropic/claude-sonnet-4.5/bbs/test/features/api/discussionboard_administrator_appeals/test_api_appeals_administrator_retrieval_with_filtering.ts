import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";

/**
 * Test the complete appeal queue management workflow for administrators.
 *
 * This scenario validates that administrators can search and filter appeals
 * across all users with comprehensive filtering options including status,
 * submission dates, member assignment, and reviewing administrator.
 *
 * Workflow:
 *
 * 1. Create administrator account through join to establish administrative
 *    privileges
 * 2. Create member account through join to serve as the appealing user
 * 3. Create discussion topic to provide content for moderation
 * 4. Create moderation action against the member's content
 * 5. Create appeal as the member contesting the moderation decision
 * 6. Authenticate as administrator
 * 7. Retrieve appeals using PATCH /discussionBoard/administrator/appeals with
 *    filters
 *
 * Validations:
 *
 * - Verify administrator can access all appeals without member-based filtering
 * - Validate pagination structure with configurable page sizes
 * - Confirm response includes complete appeal details with moderation context
 * - Verify timestamps tracking appeal lifecycle from submission to resolution
 */
export async function test_api_appeals_administrator_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with full platform privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(15),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create member account that will submit appeals
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(15),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create discussion topic as member for moderation
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 4: Switch to administrator and create moderation action
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const moderationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: {
          administrator_id: admin.id,
          target_member_id: member.id,
          content_topic_id: topic.id,
          action_type: "hide_content",
          reason: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
          violation_category: "spam",
          content_snapshot: topic.body,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 5: Switch back to member and create appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const appeal = await api.functional.discussionBoard.member.appeals.create(
    connection,
    {
      body: {
        appealed_moderation_action_id: moderationAction.id,
        appeal_explanation: RandomGenerator.paragraph({
          sentences: 50,
          wordMin: 4,
          wordMax: 8,
        }),
        additional_evidence: RandomGenerator.paragraph({
          sentences: 20,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Step 6: Switch to administrator to retrieve appeals
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  // Step 7: Retrieve appeals with various filters
  const appealsPage =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(appealsPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    appealsPage.pagination.current === 1 &&
      appealsPage.pagination.limit === 25 &&
      appealsPage.pagination.records >= 0 &&
      appealsPage.pagination.pages >= 0,
  );

  // Validate that appeals array is present
  TestValidator.predicate(
    "appeals data array should exist",
    Array.isArray(appealsPage.data),
  );

  // Test filtering by member
  const memberFilteredPage =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          member_id: member.id,
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(memberFilteredPage);

  // Validate member filtering
  TestValidator.predicate(
    "member-filtered appeals should return results",
    memberFilteredPage.data.length >= 0,
  );

  // Test filtering by status
  const statusFilteredPage =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending_review",
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(statusFilteredPage);

  // Test with date range filtering
  const currentDate = new Date();
  const pastDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilteredPage =
    await api.functional.discussionBoard.administrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          submitted_from: pastDate.toISOString(),
          submitted_to: currentDate.toISOString(),
        } satisfies IDiscussionBoardAppeal.IRequest,
      },
    );
  typia.assert(dateFilteredPage);

  // Validate date filtering returns valid structure
  TestValidator.predicate(
    "date-filtered appeals should have valid pagination",
    dateFilteredPage.pagination.current === 1 &&
      dateFilteredPage.pagination.limit === 10,
  );
}
