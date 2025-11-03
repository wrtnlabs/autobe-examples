import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_report_processing_update_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create member context (member will be used to create article and file report)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "Str0ngPassw@rd12",
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/create-article",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2) Member creates an article to be reported
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Member files a report against the created article
  const explanation = RandomGenerator.paragraph({ sentences: 8 });
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        target_type: "article",
        target_id: article.id,
        reason_category: "Other",
        explanation,
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // Save original report details for later comparisons
  const originalReportId = report.id;
  const originalCreatedAt = report.created_at;
  const originalReporterId = report.reporter_member_id;

  // 4) Prepare moderator context without mutating the original member connection
  const modConn: api.IConnection = { ...connection, headers: {} };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "Adm1nStr0ngP@ss",
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/moderate",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 5) Moderator triages the report (set status -> 'triaged' and processed_at >= created_at)
  const processedAt = new Date(
    Math.max(Date.now(), new Date(originalCreatedAt).getTime()),
  ).toISOString();
  const triaged: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(modConn, {
      reportId: originalReportId,
      body: {
        status: "triaged",
        processed_at: processedAt,
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(triaged);

  // Validate processed_at chronology and that reporter/explanation remain unchanged
  TestValidator.predicate(
    "processed_at is present after triage",
    triaged.processed_at !== null && triaged.processed_at !== undefined,
  );
  TestValidator.predicate(
    "processed_at is >= created_at",
    new Date(triaged.processed_at!).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  TestValidator.equals(
    "reporter id unchanged after triage",
    triaged.reporter_member_id,
    originalReporterId,
  );
  TestValidator.equals(
    "explanation unchanged after triage",
    triaged.explanation,
    explanation,
  );

  // 6) Moderator resolves the report (set status -> 'resolved' and closed_at >= processed_at)
  const resolvedClosedAt = new Date(
    Math.max(Date.now(), new Date(triaged.processed_at!).getTime()),
  ).toISOString();
  const resolved: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(modConn, {
      reportId: originalReportId,
      body: {
        status: "resolved",
        closed_at: resolvedClosedAt,
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(resolved);

  TestValidator.equals(
    "report id unchanged after resolve",
    resolved.id,
    originalReportId,
  );
  TestValidator.predicate(
    "closed_at is present after resolve",
    resolved.closed_at !== null && resolved.closed_at !== undefined,
  );
  TestValidator.predicate(
    "closed_at is >= processed_at",
    new Date(resolved.closed_at!).getTime() >=
      new Date(resolved.processed_at!).getTime(),
  );
  TestValidator.equals(
    "reporter id unchanged after resolve",
    resolved.reporter_member_id,
    originalReporterId,
  );
  TestValidator.equals(
    "explanation unchanged after resolve",
    resolved.explanation,
    explanation,
  );

  // Optional check: Ensure no sensitive reporter_session_id leaked to the default moderator response
  // (If returned, it must be a UUID or null - we assert that it is null/undefined to ensure no leakage in defaults)
  TestValidator.predicate(
    "reporter_session_id not leaked in default moderator response",
    resolved.reporter_session_id === null ||
      resolved.reporter_session_id === undefined,
  );

  // 7) NEGATIVE CASES
  // a) Member attempting moderator update -> expect 403 Forbidden
  await TestValidator.httpError(
    "member cannot perform moderator update",
    403,
    async () => {
      await api.functional.discussionBoard.moderator.reports.update(
        connection,
        {
          reportId: originalReportId,
          body: {
            status: "resolved",
            closed_at: new Date().toISOString(),
          } satisfies IDiscussionBoardReport.IUpdate,
        },
      );
    },
  );

  // b) Moderator attempts to set closed_at earlier than created_at -> expect 400 Bad Request
  await TestValidator.httpError(
    "closed_at earlier than created_at should fail",
    400,
    async () => {
      await api.functional.discussionBoard.moderator.reports.update(modConn, {
        reportId: originalReportId,
        body: {
          closed_at: new Date(
            new Date(originalCreatedAt).getTime() - 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardReport.IUpdate,
      });
    },
  );

  // c) Moderator attempts to update a non-existent report -> expect 404 Not Found
  await TestValidator.httpError(
    "non-existent report should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.moderator.reports.update(modConn, {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "triaged",
          processed_at: new Date().toISOString(),
        } satisfies IDiscussionBoardReport.IUpdate,
      });
    },
  );
}
