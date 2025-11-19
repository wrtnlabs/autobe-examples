import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test advanced filtering capabilities for content report search, including
 * combined filters, text search within report details, and complex query
 * scenarios. Validates that moderators can efficiently narrow down report lists
 * using multiple filter criteria simultaneously, supporting effective
 * moderation workflow management and prioritization.
 */
export async function test_api_content_reports_advanced_filtering(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        moderation_level: "senior",
        href: "https://example.com",
        referrer: "https://example.com/register",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "member123",
        href: "https://example.com",
        referrer: "https://example.com/register",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. Create discussion channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 4. Create section within channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          channel: {
            id: channel.id,
            name: channel.name,
            description: channel.description,
            status: channel.status,
            created_at: channel.created_at,
          } satisfies IDiscussionBoardChannel.ISummary,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);

  // 5. Create discussion post
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // 6. Create comment on post
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 7. Create multiple content reports with varied statuses and priorities
  const reports: IDiscussionBoardContentReport[] = [];
  const reportReasons = [
    "spam",
    "harassment",
    "inappropriate",
    "misinformation",
    "copyright",
    "other",
  ] as const;
  const priorities = ["low", "normal", "high", "critical"] as const;

  for (let i = 0; i < 10; i++) {
    const report: IDiscussionBoardContentReport =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: {
            report_reason: RandomGenerator.pick(reportReasons),
            report_details: RandomGenerator.content({ paragraphs: 1 }),
            priority: RandomGenerator.pick(priorities),
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // Switch to moderator account for filtering tests
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      href: "https://example.com",
      referrer: "https://example.com/login",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 8. Test basic pagination
  const basicResults: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(basicResults);
  TestValidator.predicate(
    "basic pagination returns data",
    basicResults.data.length > 0,
  );

  // 9. Test status filtering
  const pendingReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(pendingReports);

  // 10. Test priority filtering
  const highPriorityReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          priority: "high",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(highPriorityReports);

  // 11. Test actor type filtering
  const memberReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          actor_type: "member",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(memberReports);

  // 12. Test report reason filtering
  const spamReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          report_reason: "spam",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(spamReports);

  // 13. Test content type filtering
  const postReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          content_type: "post",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(postReports);

  // 14. Test date range filtering
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  const recentReports: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: yesterday,
          created_at_end: today,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(recentReports);

  // 15. Test text search within report details
  const searchTerm = RandomGenerator.substring(
    reports[0].report_details ?? "test report",
  );
  const searchResults: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: searchTerm,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(searchResults);

  // 16. Test combined filters
  const combinedFilterResults: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          priority: "high",
          actor_type: "member",
          report_reason: "spam",
          created_at_start: yesterday,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(combinedFilterResults);

  // 17. Validate pagination with filters
  const paginatedResults: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 2,
          limit: 3,
          status: "pending",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination returns correct page",
    paginatedResults.pagination.current,
    2,
  );

  // 18. Test empty filter results
  const emptyResults: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "resolved", // Assuming no resolved reports in test data
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(emptyResults);

  // 19. Validate report structure in filtered results
  if (pendingReports.data.length > 0) {
    const sampleReport = pendingReports.data[0];
    TestValidator.predicate("report has valid ID", sampleReport.id.length > 0);
    TestValidator.predicate(
      "report has actor information",
      sampleReport.actor.id.length > 0,
    );
    TestValidator.predicate(
      "report has content information",
      sampleReport.content.id.length > 0,
    );
    TestValidator.equals(
      "report status matches filter",
      sampleReport.status,
      "pending",
    );
  }

  // 20. Test complex query with multiple conditions
  const complexQueryResults: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          status: "pending",
          priority: "normal",
          actor_type: "member",
          report_reason: "other",
          search: "test",
          created_at_start: yesterday,
          created_at_end: today,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(complexQueryResults);

  console.log("Advanced filtering test completed successfully");
}
