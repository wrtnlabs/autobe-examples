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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_moderation_action_retrieve_redaction_by_role(
  connection: api.IConnection,
) {
  // 1) Member sign-up
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail,
      password: "P@ssw0rd1234",
      display_name: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 2) Create an article as the member (use draft state to avoid publish preconditions)
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_slug: null,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3) Create a report against the article
  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        target_type: "article",
        target_id: article.id,
        reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
        explanation: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // 4) Moderator sign-up (becomes the active auth on connection)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: moderatorEmail,
      password: "Str0ngModerator!",
      display_name: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 5) Create a moderation action referencing the report
  const action =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          discussion_board_report_id: report.id,
          action_type: "hide",
          action_reason: "Inappropriate content reported",
          action_duration_days: null,
          target_type: "article",
          target_id: article.id,
          effective_from: null,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(action);

  // 6) Retrieve the moderation action and verify redaction semantics
  const retrieved: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.at(
      connection,
      {
        actionId: action.id,
      },
    );
  typia.assert(retrieved);

  // Basic identity assertion
  TestValidator.equals(
    "retrieved action id matches created action",
    retrieved.id,
    action.id,
  );

  // Sensitive fields redaction check for standard moderator:
  // The report summary type may include reporterMemberId but exposure is restricted.
  // Assert that either no report was returned or reporterMemberId is explicitly null
  // (indicating redaction) or reporter summary is absent.
  TestValidator.predicate(
    "sensitive report fields redacted for standard moderator",
    retrieved.report === null ||
      retrieved.report === undefined ||
      retrieved.report.reporterMemberId === null ||
      retrieved.report.reporter === undefined,
  );
}
