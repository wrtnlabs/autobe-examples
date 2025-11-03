import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerationOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationOverview";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IKeyValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IKeyValue";
import type { IProcessingTime } from "@ORGANIZATION/PROJECT-api/lib/structures/IProcessingTime";

export async function test_api_moderation_dashboard_overview_with_metrics(
  connection: api.IConnection,
) {
  // 1) Create two members, each creates an article and files a report
  const createdReports: IDiscussionBoardReport[] = [];
  const createdArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < 2; ++i) {
    const username = RandomGenerator.alphaNumeric(8);
    const email = typia.random<string & tags.Format<"email">>();

    const member = await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password: "P@ssw0rd-12#", // >=12 chars, meets complexity
        href: "https://example.com/",
        referrer: "https://referrer.example.com/",
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(member);

    // Create one article for this member
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          category_slug: null,
          tag_slugs: [],
          state: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    createdArticles.push(article);

    // Create one report for the created article with a varied reason
    const reasons = [
      "Spam",
      "Harassment",
      "Misinformation",
      "Illegal",
      "Other",
    ] as const;
    const reason = RandomGenerator.pick(
      reasons,
    ) as IDiscussionBoardReportReasonCategory;

    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      {
        body: {
          target_type: "article",
          target_id: article.id,
          reason_category: reason,
          explanation: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
    typia.assert(report);
    createdReports.push(report);
  }

  // 2) Create a moderator account
  const modEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: modEmail,
      password: "P@ssw0rd-12#",
      href: "https://example.com/",
      referrer: "https://referrer.example.com/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 3) As moderator, create a moderation action referencing the first report
  const targetReport = createdReports[0];
  const targetArticle = createdArticles[0];

  const moderationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          discussion_board_report_id: targetReport.id,
          action_type: "hide",
          action_reason: "Inappropriate content - automated triage",
          action_duration_days: null,
          target_type: "article",
          target_id: targetArticle.id,
          effective_from: null,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 4) Fetch the moderation overview as the authenticated moderator
  const overview: IDiscussionBoardModerationOverview =
    await api.functional.discussionBoard.moderator.dashboard.moderationOverview.overview(
      connection,
    );
  typia.assert(overview);

  // Basic structural validations (typia.assert already validated types):
  TestValidator.predicate(
    "generated_at is present",
    typeof overview.generated_at === "string",
  );

  TestValidator.predicate(
    "pending_reports_24h is a non-negative number",
    typeof overview.pending_reports_24h === "number" &&
      overview.pending_reports_24h >= 0,
  );

  TestValidator.predicate(
    "pending_reports_7d is a non-negative number",
    typeof overview.pending_reports_7d === "number" &&
      overview.pending_reports_7d >= 0,
  );

  TestValidator.predicate(
    "average_processing_times is an array",
    Array.isArray(overview.average_processing_times),
  );

  TestValidator.predicate(
    "recent_high_priority_audits is an array",
    Array.isArray(overview.recent_high_priority_audits),
  );

  // Business validation: the actions_breakdown should include the created action type
  TestValidator.predicate(
    `actions_breakdown contains action type ${moderationAction.actionType}`,
    ArrayUtil.has(
      overview.actions_breakdown,
      (kv) => kv.key === moderationAction.actionType,
    ),
  );

  // Ensure each key/value entry is a sensible non-negative number
  TestValidator.predicate(
    "actions_breakdown values are non-negative",
    overview.actions_breakdown.every(
      (kv) => typeof kv.value === "number" && kv.value >= 0,
    ),
  );

  // recent_high_priority_audits items are sanitized summaries (typia.assert already ensures required fields)
  TestValidator.predicate(
    "recent audits entries are short summaries",
    overview.recent_high_priority_audits.every(
      (a) =>
        typeof a.id === "string" &&
        typeof a.event_type === "string" &&
        typeof a.occurred_at === "string" &&
        typeof a.short_summary === "string",
    ),
  );

  // 5) Negative case: unauthenticated / non-moderator should not be able to call overview
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-moderator cannot access moderation overview",
    async () => {
      await api.functional.discussionBoard.moderator.dashboard.moderationOverview.overview(
        unauthConn,
      );
    },
  );
}
