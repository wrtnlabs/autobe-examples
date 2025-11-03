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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Validate moderation queue aggregation and prioritized triage flow for
 * moderator actors.
 *
 * Steps:
 *
 * 1. Register two members (reporters) and one moderator (triage actor).
 * 2. Using member1: create an article, an attachment for that article, and a
 *    comment under the article.
 * 3. File multiple reports across targets (article, comment, attachment) using
 *    both members to create aggregated reportCounts.
 * 4. Using the moderator context, query PATCH
 *    /discussionBoard/moderator/moderationQueue with priority and
 *    includeReporterContext to retrieve aggregated, prioritized queue items.
 * 5. Validate pagination, that created targets are present, that reportCount
 *    aggregation influences ordering (higher reportCount first), that reporter
 *    context is present when requested, and that RBAC prevents members from
 *    calling the moderator endpoint.
 */
export async function test_api_moderation_queue_report_prioritization(
  connection: api.IConnection,
) {
  // Prepare isolated connection contexts so SDK can manage Authorization headers
  const memberConn1: api.IConnection = { ...connection, headers: {} };
  const memberConn2: api.IConnection = { ...connection, headers: {} };
  const moderatorConn: api.IConnection = { ...connection, headers: {} };

  // 1) Register moderator and two members
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: `Mod${RandomGenerator.alphaNumeric(10)}!`,
        display_name: RandomGenerator.name(),
        href: "https://example.com/", // session context
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn1, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: member1Email,
        password: `Pass${RandomGenerator.alphaNumeric(10)}!`,
        display_name: RandomGenerator.name(),
        href: "https://example.com/",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn2, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: member2Email,
        password: `Pass${RandomGenerator.alphaNumeric(10)}!`,
        display_name: RandomGenerator.name(),
        href: "https://example.com/",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member2);

  // 2) Member1 creates an article, attachment, and a comment
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(memberConn1, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 12,
          sentenceMax: 18,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      memberConn1,
      {
        articleId: article.id,
        body: {
          original_filename: `file-${RandomGenerator.alphaNumeric(6)}.png`,
          storage_key: typia.random<string & tags.Format<"uri">>(),
          mime_type: "image/png",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<5242880>
          >(),
          is_image: true,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConn1,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3) Submit reports using both members to create aggregated counts
  // member1 reports: article, comment
  const reportA1: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(memberConn1, {
      body: {
        target_type: "article",
        target_id: article.id,
        reason_category: "Spam",
        explanation: "Inappropriate content repeated",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportA1);

  const reportC1: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(memberConn1, {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason_category: "Harassment",
        explanation: "Offensive language",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportC1);

  // member2 reports: article, comment, attachment — ensures duplicates across reporters
  const reportA2: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(memberConn2, {
      body: {
        target_type: "article",
        target_id: article.id,
        reason_category: "Misinformation",
        explanation: "Contains misleading claims",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportA2);

  const reportC2: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(memberConn2, {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason_category: "Harassment",
        explanation: "Abusive reply",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportC2);

  const reportAtt2: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(memberConn2, {
      body: {
        target_type: "attachment",
        target_id: attachment.id,
        reason_category: "Other",
        explanation: "Attachment is irrelevant",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportAtt2);

  // 4) Moderator queries moderation queue requesting reporter context and priority
  const page: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderationQueue.index(
      moderatorConn,
      {
        body: {
          page: 1,
          limit: 20,
          priority: true,
          includeReporterContext: true,
          sortBy: "priority",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(page);

  // Business validations
  TestValidator.predicate("pagination present and sensible", () => {
    return (
      typeof page.pagination?.current === "number" &&
      typeof page.pagination?.limit === "number" &&
      page.pagination.current >= 1 &&
      page.pagination.limit >= 1
    );
  });

  // At least one returned item references created article/comment/attachment
  TestValidator.predicate(
    "moderation queue contains our targets",
    () =>
      ArrayUtil.has(page.data, (d) => d.targetId === article.id) ||
      ArrayUtil.has(page.data, (d) => d.targetId === comment.id) ||
      ArrayUtil.has(page.data, (d) => d.targetId === attachment.id),
  );

  // Ensure aggregated reportCount exists and ordering by priority (desc)
  TestValidator.predicate("reportCount present for items", () =>
    page.data.some(
      (d) => d.reportCount !== null && d.reportCount !== undefined,
    ),
  );

  TestValidator.predicate("items sorted by reportCount descending", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const item of page.data) {
      const count = item.reportCount ?? 0;
      if (count > previous) return false; // ascending found -> fail
      previous = count;
    }
    return true;
  });

  // Reporter context: because includeReporterContext=true and moderator has audit role,
  // at least one summary should include reporter metadata but must not include session-level PII like 'reporter_session_id' or 'email'
  TestValidator.predicate("reporter context included when requested", () => {
    const found = page.data.find(
      (d) => d.reporter !== undefined && d.reporter !== null,
    );
    if (!found) return false;
    // Ensure reporter summary does not include email property (PII) in summary object
    const reporter = found.reporter as
      | IDiscussionBoardMember.ISummary
      | undefined
      | null;
    if (!reporter) return false;
    // reporter summary schema does not include email; check defensively
    return !("email" in (reporter as any));
  });

  // 5) Role-based access control: member context must not be able to call moderator endpoint
  await TestValidator.error(
    "member cannot access moderation queue",
    async () => {
      await api.functional.discussionBoard.moderator.moderationQueue.index(
        memberConn1,
        {
          body: { page: 1, limit: 1 } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    },
  );
}
