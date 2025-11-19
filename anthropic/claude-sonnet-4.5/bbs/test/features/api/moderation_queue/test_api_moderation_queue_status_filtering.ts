import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test moderation queue filtering by report status for focused moderation
 * workflows.
 *
 * This test validates that moderators can filter the moderation queue to show
 * only reports matching specific status criteria. Creates multiple content
 * reports with different statuses (pending, reviewed_no_action,
 * reviewed_edited, reviewed_removed) and validates that status filtering
 * correctly queries the discussion_board_content_reports table to return only
 * matching records.
 *
 * The test verifies that filtering for 'pending' status excludes all reviewed
 * reports, which is critical for moderators focusing on actionable items
 * requiring immediate review. This scenario tests the most common moderation
 * queue filtering pattern used in daily moderation workflows.
 *
 * Steps:
 *
 * 1. Create moderator account for report resolution
 * 2. Create article category for article creation
 * 3. Create multiple member accounts for report submission
 * 4. Create multiple articles to be reported
 * 5. Submit multiple content reports (all initially pending)
 * 6. Resolve some reports with different resolution statuses
 * 7. Filter queue by pending status and validate only pending reports returned
 * 8. Filter queue by resolved statuses and validate correct filtering
 */
export async function test_api_moderation_queue_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for report resolution
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create article category required for article creation
  const categoryData = {
    name: "Political Discussion",
    slug: "political-discussion",
    description: "Discussions about political topics",
    sort_order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple member accounts for report submission
  const members = await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);
    return member;
  });

  // Step 4: Create multiple articles to be reported
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    await api.functional.auth.member.login(connection, {
      body: {
        email: members[index].email,
        password: "member123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ILogin,
    });

    const statuses = ["draft", "published"] as const;
    const articleData = {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 10,
        sentenceMax: 20,
      }),
      discussion_board_article_category_id: category.id,
      status: RandomGenerator.pick(statuses),
    } satisfies IDiscussionBoardArticle.ICreate;

    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: articleData,
      },
    );
    typia.assert(article);
    return article;
  });

  // Step 5: Submit multiple content reports (all initially pending)
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;

  const reports = await ArrayUtil.asyncRepeat(5, async (index) => {
    await api.functional.auth.member.login(connection, {
      body: {
        email: members[index].email,
        password: "member123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ILogin,
    });

    const reportData = {
      discussion_board_article_id: articles[index].id,
      report_category: reportCategories[index],
      report_details: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IDiscussionBoardContentReport.ICreate;

    const report =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: reportData,
        },
      );
    typia.assert(report);
    return report;
  });

  // Step 6: Resolve some reports with different resolution statuses
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: "moderator123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const resolutionStatuses = [
    "reviewed_no_action",
    "reviewed_edited",
    "reviewed_removed",
  ] as const;

  await ArrayUtil.asyncRepeat(3, async (index) => {
    const updateData = {
      status: resolutionStatuses[index],
      resolution_notes: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardContentReport.IUpdate;

    const updatedReport =
      await api.functional.discussionBoard.moderator.contentReports.update(
        connection,
        {
          reportId: reports[index].id,
          body: updateData,
        },
      );
    typia.assert(updatedReport);
  });

  // Step 7: Filter queue by pending status and validate only pending reports returned
  const pendingQueueRequest = {
    status: "pending" as const,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardContentReport.IRequest;

  const pendingQueue =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: pendingQueueRequest,
      },
    );
  typia.assert(pendingQueue);

  TestValidator.predicate(
    "pending queue should contain only pending reports",
    pendingQueue.data.every((report) => report.status === "pending"),
  );

  TestValidator.equals(
    "pending queue should have 2 reports",
    pendingQueue.data.length,
    2,
  );

  TestValidator.predicate(
    "pending reports should have null resolved_at",
    pendingQueue.data.every(
      (report) =>
        report.resolved_at === null || report.resolved_at === undefined,
    ),
  );

  TestValidator.predicate(
    "pagination records should match data length",
    pendingQueue.pagination.records >= pendingQueue.data.length,
  );

  // Step 8: Filter queue by reviewed_no_action status
  const reviewedNoActionRequest = {
    status: "reviewed_no_action" as const,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardContentReport.IRequest;

  const reviewedNoActionQueue =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: reviewedNoActionRequest,
      },
    );
  typia.assert(reviewedNoActionQueue);

  TestValidator.predicate(
    "reviewed_no_action queue should contain only reviewed_no_action reports",
    reviewedNoActionQueue.data.every(
      (report) => report.status === "reviewed_no_action",
    ),
  );

  TestValidator.equals(
    "reviewed_no_action queue should have 1 report",
    reviewedNoActionQueue.data.length,
    1,
  );

  TestValidator.predicate(
    "reviewed_no_action reports should have resolved_at timestamp",
    reviewedNoActionQueue.data.every(
      (report) =>
        report.resolved_at !== null && report.resolved_at !== undefined,
    ),
  );

  // Verify reviewed_edited filter
  const reviewedEditedRequest = {
    status: "reviewed_edited" as const,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardContentReport.IRequest;

  const reviewedEditedQueue =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: reviewedEditedRequest,
      },
    );
  typia.assert(reviewedEditedQueue);

  TestValidator.predicate(
    "reviewed_edited queue should contain only reviewed_edited reports",
    reviewedEditedQueue.data.every(
      (report) => report.status === "reviewed_edited",
    ),
  );

  TestValidator.predicate(
    "reviewed_edited reports should have resolved_at timestamp",
    reviewedEditedQueue.data.every(
      (report) =>
        report.resolved_at !== null && report.resolved_at !== undefined,
    ),
  );

  // Verify reviewed_removed filter
  const reviewedRemovedRequest = {
    status: "reviewed_removed" as const,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardContentReport.IRequest;

  const reviewedRemovedQueue =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: reviewedRemovedRequest,
      },
    );
  typia.assert(reviewedRemovedQueue);

  TestValidator.predicate(
    "reviewed_removed queue should contain only reviewed_removed reports",
    reviewedRemovedQueue.data.every(
      (report) => report.status === "reviewed_removed",
    ),
  );

  TestValidator.predicate(
    "reviewed_removed reports should have resolved_at timestamp",
    reviewedRemovedQueue.data.every(
      (report) =>
        report.resolved_at !== null && report.resolved_at !== undefined,
    ),
  );
}
