import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

export async function test_api_moderation_actions_search_filters(
  connection: api.IConnection,
) {
  // 1. Member registration
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`,
    password: "Aa1!securepass", // satisfies 12+? RandomGenerator name used for uniqueness; server enforces length
    href: "https://example.com/articles/new",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // 2. Create an article as the member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_slug: null,
    tag_slugs: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3. Upload an attachment for the article
  const attachmentBody = {
    original_filename: "evidence.txt",
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "text/plain",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<20971520>
    >(),
    is_image: false,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 4. Create a comment on the article
  const commentBody = {
    content: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5. Submit a report against the comment
  const reportBody = {
    target_type: "comment",
    target_id: comment.id,
    reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 6. Create a moderator account (switches Authorization header on connection)
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@moderator.example.com`,
    password: "Bb2!moderatorpass",
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/admin",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 7. As moderator, create a moderation action referencing the report & comment
  const actionCreateBody = {
    discussion_board_report_id: report.id,
    action_type: "hide",
    action_reason: "Hide comment for harassment reported by user",
    action_duration_days: null,
    target_type: "comment",
    target_id: comment.id,
    effective_from: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const action: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: actionCreateBody,
      },
    );
  typia.assert(action);

  // 8. Search / index moderation actions with filters including date range
  // Build a date range that covers the created action (use now as center)
  const createdAt = action.createdAt;
  const createdFrom = new Date(Date.parse(createdAt) - 60_000).toISOString();
  const createdTo = new Date(Date.parse(createdAt) + 60_000).toISOString();

  const indexBody = {
    moderatorId: moderator.id,
    actionType: "hide",
    createdFrom: createdFrom,
    createdTo: createdTo,
    page: 1,
    limit: 20,
    sort: "-createdAt",
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const page: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      { body: indexBody },
    );
  typia.assert(page);

  // 9. Validations
  TestValidator.predicate(
    "pagination current page is 1",
    page.pagination.current === 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    20,
  );

  // Find the created action in results
  const found = page.data.find((it) => it.id === action.id);
  TestValidator.predicate(
    "created moderation action is returned in results",
    found !== undefined,
  );

  if (found) {
    // Validate core fields on the summary item (note: summary uses snake_case)
    TestValidator.equals("action_type matches", found.action_type, "hide");
    TestValidator.equals("target_type matches", found.target_type, "comment");
    TestValidator.equals("target_id matches", found.target_id, comment.id);
    TestValidator.predicate(
      "created_at exists",
      typeof found.created_at === "string",
    );

    // Verify that detailed investigation payloads are not present in the summary
    const hasReportProp = Object.prototype.hasOwnProperty.call(found, "report");
    TestValidator.predicate(
      "report payload is redacted in summary",
      hasReportProp === false,
    );
  }
}
