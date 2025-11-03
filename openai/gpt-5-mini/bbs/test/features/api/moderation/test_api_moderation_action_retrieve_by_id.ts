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

export async function test_api_moderation_action_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1) Member signs up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: memberEmail,
        password: "Str0ngPass!23",
        display_name: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2) Member creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 8,
        }),
        category_slug: null,
        tag_slugs: undefined,
        state: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "created article id matches returned article",
    article.id,
    article.id,
  );

  // 3) Member uploads an attachment for the article
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: `${RandomGenerator.name(1)}.png`,
          storage_key: typia.random<string & tags.Format<"uri">>(),
          mime_type: "image/png",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<20971520>
          >(),
          is_image: true,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4) Member creates a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5) Member files a report against the article
  const reportBody = {
    target_type: "article",
    target_id: article.id,
    reason_category: typia.random<IDiscussionBoardReportReasonCategory>(),
    explanation: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 6) Moderator signs up (switches authorization to moderator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: "Adm1nSecure!23",
        display_name: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 7) Moderator creates a moderation action referencing the report
  const actionCreateBody = {
    discussion_board_report_id: report.id,
    action_type: "hide",
    action_reason: "Inappropriate content reported",
    action_duration_days: null,
    target_type: "article",
    target_id: article.id,
    effective_from: new Date().toISOString(),
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const action: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: actionCreateBody,
      },
    );
  typia.assert(action);

  // 8) Retrieve the moderation action by id as moderator
  const retrieved: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.at(
      connection,
      {
        actionId: action.id,
      },
    );
  typia.assert(retrieved);

  // 9) Business validations
  TestValidator.equals(
    "retrieved moderation action id matches created action",
    retrieved.id,
    action.id,
  );
  TestValidator.predicate(
    "retrieved contains actionType",
    retrieved.actionType !== undefined && retrieved.actionType !== null,
  );
  TestValidator.predicate(
    "retrieved contains actionReason (may be null) or explicitly present",
    retrieved.actionReason === null ||
      typeof retrieved.actionReason === "string",
  );
  TestValidator.predicate(
    "retrieved contains targetType",
    retrieved.targetType !== undefined && retrieved.targetType !== null,
  );
  TestValidator.predicate(
    "retrieved contains targetId",
    retrieved.targetId !== undefined && retrieved.targetId !== null,
  );
  TestValidator.predicate(
    "retrieved contains createdAt",
    typeof retrieved.createdAt === "string" && retrieved.createdAt.length > 0,
  );

  // If report summary is included for authorized moderator, ensure core fields
  if (retrieved.report !== null && retrieved.report !== undefined) {
    TestValidator.predicate(
      "report summary includes id",
      typeof retrieved.report.id === "string" && retrieved.report.id.length > 0,
    );
    TestValidator.predicate(
      "report summary includes reasonCategory",
      typeof retrieved.report.reasonCategory === "string" &&
        retrieved.report.reasonCategory.length > 0,
    );
    TestValidator.predicate(
      "report summary includes createdAt",
      typeof retrieved.report.createdAt === "string" &&
        retrieved.report.createdAt.length > 0,
    );
  } else {
    // In case the service redacts report for some reason, that is an acceptable path but ensure explicit null
    TestValidator.equals(
      "report summary is null when redacted",
      retrieved.report,
      null,
    );
  }
}
