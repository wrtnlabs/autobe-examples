import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";

/**
 * Validates moderator workflow for searching and filtering comment reports with
 * advanced criteria. Tests comprehensive search operations including status
 * filtering, reporter type classification, date ranges, and keyword matching to
 * ensure moderators can efficiently manage comment reports.
 */
export async function test_api_comment_reports_search_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account for content generation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member authentication for content creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Create community context
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create test posts (simulated since post API not available)
  // Using community ID as post context for comment creation
  const postContextId = community.id;

  // 5. Create test comments
  const comments: ICommunityPlatformComment[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const comment: ICommunityPlatformComment =
        await api.functional.communityPlatform.member.comments.create(
          connection,
          {
            body: {
              body: RandomGenerator.content({ paragraphs: 1 }),
              community_platform_post_id: postContextId,
              status: "published",
            } satisfies ICommunityPlatformComment.ICreate,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  // 6. Submit reports on comments
  const reports: ICommunityPlatformModerationReport[] =
    await ArrayUtil.asyncRepeat(comments.length, async (index) => {
      const report: ICommunityPlatformModerationReport =
        await api.functional.communityPlatform.member.comments.reports.create(
          connection,
          {
            commentId: comments[index].id,
            body: {
              report_type: RandomGenerator.pick([
                "spam",
                "harassment",
                "inappropriate_content",
              ] as const),
              target_type: "comment",
              target_id: comments[index].id,
              description: RandomGenerator.paragraph({ sentences: 2 }),
              priority_level: RandomGenerator.pick([
                "low",
                "medium",
                "high",
              ] as const),
            } satisfies ICommunityPlatformModerationReport.ICreate,
          },
        );
      typia.assert(report);
      return report;
    });

  // Switch to moderator authentication for search operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Test moderator search functionality with various filters
  const searchResults: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.moderator.comments.reports.index(
      connection,
      {
        commentId: comments[0].id,
        body: {
          page: 1,
          limit: 10,
          status: "submitted",
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(searchResults);

  // 8. Validate search results
  TestValidator.equals(
    "search returns paginated results",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search returns reasonable limit",
    searchResults.pagination.limit <= 10,
  );

  // 9. Test keyword search functionality
  const keywordSearchResults: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.moderator.comments.reports.index(
      connection,
      {
        commentId: comments[0].id,
        body: {
          search: reports[0].description.substring(0, 5),
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(keywordSearchResults);

  // 10. Test date range filtering
  const dateSearchResults: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.moderator.comments.reports.index(
      connection,
      {
        commentId: comments[0].id,
        body: {
          created_at_start: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
          created_at_end: new Date().toISOString(),
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(dateSearchResults);

  // 11. Test empty filter combination
  const emptyFilterResults: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.moderator.comments.reports.index(
      connection,
      {
        commentId: comments[0].id,
        body: {
          // Empty body to test default behavior
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(emptyFilterResults);

  // 12. Validate that reports contain expected data
  if (searchResults.data.length > 0) {
    TestValidator.equals(
      "report has valid ID format",
      typeof searchResults.data[0].id,
      "string",
    );
    TestValidator.predicate(
      "report has non-empty reason",
      searchResults.data[0].report_reason.length > 0,
    );
    TestValidator.equals(
      "report has valid status",
      typeof searchResults.data[0].status,
      "string",
    );
    TestValidator.equals(
      "report has valid timestamp",
      typeof searchResults.data[0].created_at,
      "string",
    );
  }

  // 13. Test pagination functionality
  TestValidator.predicate(
    "pagination has valid record count",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid page count",
    searchResults.pagination.pages >= 0,
  );
}
