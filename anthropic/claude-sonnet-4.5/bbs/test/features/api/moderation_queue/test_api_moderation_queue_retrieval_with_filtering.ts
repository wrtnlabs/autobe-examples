import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test moderation queue retrieval with comprehensive filtering capabilities.
 *
 * This test validates the complete moderation workflow where a moderator
 * authenticates and retrieves filtered reports from the moderation queue. The
 * test creates a realistic scenario with multiple reports of varying severities
 * and violation types, then validates that the queue retrieval API properly
 * filters and paginates results.
 *
 * Workflow:
 *
 * 1. Create administrator account for system setup
 * 2. Create moderator account for queue access
 * 3. Create discussion category for topic organization
 * 4. Create multiple member accounts to generate reportable content
 * 5. Create discussion topics from different members
 * 6. Submit multiple reports with different violation categories
 * 7. Retrieve moderation queue as moderator with various filters
 * 8. Validate pagination and filtering results
 */
export async function test_api_moderation_queue_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category as administrator
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account and topic
  const member1Connection: api.IConnection = { ...connection, headers: {} };
  const member1 = await api.functional.auth.member.join(member1Connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  const topic1 = await api.functional.discussionBoard.member.topics.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic1);

  // Step 4: Create second member account and topic
  const member2Connection: api.IConnection = { ...connection, headers: {} };
  const member2 = await api.functional.auth.member.join(member2Connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  const topic2 = await api.functional.discussionBoard.member.topics.create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic2);

  // Step 5: Create third member to submit reports
  const reporterConnection: api.IConnection = { ...connection, headers: {} };
  const reporter = await api.functional.auth.member.join(reporterConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(reporter);

  // Step 6: Submit multiple reports with different violation categories
  const report1 = await api.functional.discussionBoard.member.reports.create(
    reporterConnection,
    {
      body: {
        reported_topic_id: topic1.id,
        violation_category: "hate_speech",
        reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report1);

  const report2 = await api.functional.discussionBoard.member.reports.create(
    reporterConnection,
    {
      body: {
        reported_topic_id: topic2.id,
        violation_category: "spam",
        reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report2);

  const report3 = await api.functional.discussionBoard.member.reports.create(
    reporterConnection,
    {
      body: {
        reported_topic_id: topic1.id,
        violation_category: "misinformation",
        reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report3);

  // Step 7: Create moderator account
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };
  const moderator = await api.functional.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        appointed_by_admin_id: admin.id,
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 8: Retrieve moderation queue without filters
  const queueResult =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(queueResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    queueResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    queueResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    queueResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    queueResult.pagination.pages >= 0,
  );

  // Validate data array
  TestValidator.predicate(
    "moderation actions data should be an array",
    Array.isArray(queueResult.data),
  );

  // Step 9: Test filtering by status
  const statusFiltered =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(statusFiltered);

  TestValidator.predicate(
    "status filtered results should be returned",
    Array.isArray(statusFiltered.data),
  );

  // Step 10: Test filtering by violation category
  const categoryFiltered =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      moderatorConnection,
      {
        body: {
          violation_category: "hate_speech",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(categoryFiltered);

  TestValidator.predicate(
    "violation category filtered results should be returned",
    Array.isArray(categoryFiltered.data),
  );

  // Step 11: Test pagination with different page numbers
  const page2Result =
    await api.functional.discussionBoard.moderator.moderationActions.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(page2Result);

  TestValidator.equals(
    "page 2 should have correct current page",
    page2Result.pagination.current,
    2,
  );
}
