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
 * Test comprehensive content report search functionality for moderators.
 *
 * This test validates that authenticated moderators can search, filter, and
 * retrieve paginated lists of content reports with various criteria including
 * status, priority, actor type, report reason, and date ranges. The test
 * implements the complete moderation workflow from report creation through
 * search and retrieval operations.
 */
export async function test_api_content_reports_search_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "moderator123",
      moderation_level: "basic",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "member123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Switch to moderator for channel/section creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 3. Create discussion channel
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 4. Create section within channel
  const section =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Switch to member for content creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 5. Create discussion post
  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Create comment on post
  const comment =
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

  // Create multiple content reports with different parameters
  const reportReasons = [
    "spam",
    "harassment",
    "inappropriate",
    "misinformation",
    "copyright",
    "other",
  ] as const;
  const priorities = ["low", "normal", "high", "critical"] as const;

  const reports = await ArrayUtil.asyncRepeat(5, async (index) => {
    const report =
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
    return report;
  });

  // Switch back to moderator for search operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 7. Test moderator search functionality with various filters

  // Test basic pagination
  const basicSearch =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.predicate(
    "basic search returns results",
    basicSearch.data.length > 0,
  );
  TestValidator.equals(
    "pagination structure is correct",
    typeof basicSearch.pagination.current,
    "number",
  );

  // Test search by status
  const statusSearch =
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
  typia.assert(statusSearch);

  // Test search by priority
  const prioritySearch =
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
  typia.assert(prioritySearch);

  // Test search by report reason
  const reasonSearch =
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
  typia.assert(reasonSearch);

  // Test search by actor type
  const actorTypeSearch =
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
  typia.assert(actorTypeSearch);

  // Test search by content type
  const contentTypeSearch =
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
  typia.assert(contentTypeSearch);

  // Test search with date range
  const dateSearch =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          created_at_end: new Date().toISOString(),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(dateSearch);

  // Test text search
  const textSearch =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: RandomGenerator.substring(
            reports[0]?.report_details ?? "test",
          ),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(textSearch);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page is valid",
    basicSearch.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    basicSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    basicSearch.pagination.pages >= 1,
  );

  // Validate report structure in search results
  if (basicSearch.data.length > 0) {
    const sampleReport = basicSearch.data[0];
    TestValidator.predicate("report has valid ID", sampleReport.id.length > 0);
    TestValidator.predicate(
      "report has actor information",
      sampleReport.actor.id.length > 0,
    );
    TestValidator.predicate(
      "report has content information",
      sampleReport.content.id.length > 0,
    );
    TestValidator.predicate(
      "report has valid status",
      sampleReport.status.length > 0,
    );
    TestValidator.predicate(
      "report has valid priority",
      sampleReport.priority.length > 0,
    );
    TestValidator.predicate(
      "report has valid reason",
      sampleReport.report_reason.length > 0,
    );
    TestValidator.predicate(
      "report has creation timestamp",
      sampleReport.created_at.length > 0,
    );
    TestValidator.predicate(
      "report has update timestamp",
      sampleReport.updated_at.length > 0,
    );
  }
}
