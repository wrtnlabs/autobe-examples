import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test moderation queue filtering by multiple violation categories.
 *
 * This test validates that moderators can filter the moderation queue by
 * specific violation categories to focus on particular types of guideline
 * violations. It verifies that category-based filtering works correctly for
 * single categories and integrates properly with pagination and other filters.
 *
 * Note: The API supports filtering by a single violation category at a time,
 * not multiple categories simultaneously. Multiple category filtering is tested
 * by making separate requests for each category.
 *
 * Workflow:
 *
 * 1. Create administrator account for category setup
 * 2. Create moderator account for accessing moderation queue
 * 3. Create discussion category
 * 4. Create multiple member accounts for diverse content creation
 * 5. Create topics and replies with various violation types
 * 6. Submit reports with different violation categories
 * 7. Filter moderation queue by specific categories
 * 8. Verify only matching reports are returned
 * 9. Test single category filtering for all violation types
 * 10. Validate pagination with category filters
 * 11. Validate combined filters (status + violation category)
 */
export async function test_api_moderation_queue_reports_with_multiple_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category setup
  const adminCreated = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    },
  );
  typia.assert(adminCreated);

  // Step 2: Create discussion category (authenticated as administrator)
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator account
  const moderatorCreated = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        appointed_by_admin_id: adminCreated.id,
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderatorCreated);

  // Step 4: Create multiple member accounts for diverse content (store credentials)
  const memberCredentials: Array<{
    member: IDiscussionBoardMember.IAuthorized;
    username: string;
    email: string;
    password: string;
  }> = [];

  for (let i = 0; i < 5; i++) {
    const username = RandomGenerator.alphaNumeric(10);
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(12);

    const member = await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);

    memberCredentials.push({ member, username, email, password });
  }

  // Step 5: Create topics representing different violation types (use first member)
  const firstMember = memberCredentials[0];
  await api.functional.auth.member.join(connection, {
    body: {
      username: firstMember.username,
      email: firstMember.email,
      password: firstMember.password,
    } satisfies IDiscussionBoardMember.ICreate,
  });

  const topics: IDiscussionBoardTopic[] = [];
  for (let i = 0; i < 5; i++) {
    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          category_id: category.id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);
    topics.push(topic);
  }

  // Step 6: Create replies representing different violation categories
  const replies: IDiscussionBoardReply[] = [];
  for (const topic of topics.slice(0, 3)) {
    const reply =
      await api.functional.discussionBoard.member.topics.replies.create(
        connection,
        {
          topicId: topic.id,
          body: {
            discussion_board_topic_id: topic.id,
            content: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IDiscussionBoardReply.ICreate,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // Step 7: Submit reports with various violation categories (use different members as reporters)
  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
    "off_topic",
    "threats",
    "doxxing",
    "trolling",
  ] as const;

  const createdReports: IDiscussionBoardReport[] = [];

  // Create reports for topics with different violation categories
  for (let i = 0; i < topics.length && i < violationCategories.length; i++) {
    const reporterIndex = i % memberCredentials.length;
    const reporter = memberCredentials[reporterIndex];

    await api.functional.auth.member.join(connection, {
      body: {
        username: reporter.username,
        email: reporter.email,
        password: reporter.password,
      } satisfies IDiscussionBoardMember.ICreate,
    });

    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      {
        body: {
          reported_topic_id: topics[i].id,
          violation_category: violationCategories[i],
          reporter_explanation: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
    createdReports.push(report);
  }

  // Create reports for replies with remaining violation categories
  for (
    let i = 0;
    i < replies.length && topics.length + i < violationCategories.length;
    i++
  ) {
    const reporterIndex = (topics.length + i) % memberCredentials.length;
    const reporter = memberCredentials[reporterIndex];

    await api.functional.auth.member.join(connection, {
      body: {
        username: reporter.username,
        email: reporter.email,
        password: reporter.password,
      } satisfies IDiscussionBoardMember.ICreate,
    });

    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      {
        body: {
          reported_reply_id: replies[i].id,
          violation_category: violationCategories[topics.length + i],
          reporter_explanation: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
    createdReports.push(report);
  }

  // Validate all reports were created successfully
  TestValidator.predicate(
    "all reports created successfully",
    createdReports.length ===
      Math.min(topics.length + replies.length, violationCategories.length),
  );

  // Step 8: Switch to moderator account to access moderation queue
  await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: adminCreated.id,
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  // Step 9: Filter by single violation category (personal_attack)
  const singleCategoryFilter =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        violation_category: "personal_attack",
        status: "pending",
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(singleCategoryFilter);

  // Verify only personal_attack reports are returned
  TestValidator.predicate(
    "single category filter returns only matching reports",
    singleCategoryFilter.data.every(
      (report) => report.violation_category === "personal_attack",
    ),
  );

  TestValidator.predicate(
    "personal_attack category returns at least one report",
    singleCategoryFilter.data.length >= 1,
  );

  // Step 10: Test filtering with spam category
  const spamReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        violation_category: "spam",
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(spamReports);

  TestValidator.predicate(
    "spam category filter returns only spam reports",
    spamReports.data.every((report) => report.violation_category === "spam"),
  );

  // Step 11: Verify category filtering works with pagination
  const paginatedResults =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        violation_category: "hate_speech",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination with category filter returns valid page",
    paginatedResults.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResults.data.length <= 10,
  );

  // Step 12: Validate combined filters (status + violation category)
  const combinedFilter =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        status: "pending",
        violation_category: "misinformation",
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(combinedFilter);

  TestValidator.predicate(
    "combined filters work correctly",
    combinedFilter.data.every(
      (report) =>
        report.status === "pending" &&
        report.violation_category === "misinformation",
    ),
  );

  // Step 13: Test all remaining violation categories are filterable
  const categoriesToTest = [
    "threats",
    "doxxing",
    "trolling",
    "offensive_language",
    "off_topic",
  ];

  for (const category of categoriesToTest) {
    const categoryResults =
      await api.functional.discussionBoard.moderator.reports.index(connection, {
        body: {
          violation_category: category,
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardReport.IRequest,
      });
    typia.assert(categoryResults);

    TestValidator.predicate(
      `${category} category filter returns only matching reports`,
      categoryResults.data.every(
        (report) => report.violation_category === category,
      ),
    );
  }

  // Step 14: Verify filtering without violation_category returns all reports
  const allReports =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(allReports);

  TestValidator.predicate(
    "unfiltered query returns reports from multiple categories",
    allReports.data.length >= createdReports.length,
  );
}
