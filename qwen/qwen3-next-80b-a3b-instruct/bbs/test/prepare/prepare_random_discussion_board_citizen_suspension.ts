import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardCitizenSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenSuspension";
export function prepare_random_discussion_board_citizen_suspension(
  input?: DeepPartial<IDiscussionBoardCitizenSuspension.ICreate>,
): IDiscussionBoardCitizenSuspension.ICreate {
  return {
    citizen_id:
      input?.citizen_id ?? typia.random<string & tags.Format<"uuid">>(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date !== undefined
        ? input.end_date
        : input?.duration_hours !== undefined
          ? undefined
          : typia.random<string & tags.Format<"date-time">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 5,
        wordMax: 10,
      }),
    duration_hours:
      input?.duration_hours !== undefined
        ? input.duration_hours
        : input?.end_date !== undefined
          ? undefined
          : typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
            >(),
    admin_note:
      input?.admin_note ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 4,
        wordMax: 8,
      }),
    suspension_level:
      input?.suspension_level ??
      RandomGenerator.pick(["light", "medium", "heavy"] as const),
    appeal_eligible:
      input?.appeal_eligible ?? RandomGenerator.pick([true, false] as const),
    is_final: input?.is_final ?? RandomGenerator.pick([true, false] as const),
    notification_sent:
      input?.notification_sent ?? RandomGenerator.pick([true, false] as const),
    is_silent: input?.is_silent ?? RandomGenerator.pick([true, false] as const),
    affected_content: input?.affected_content
      ? input.affected_content
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => RandomGenerator.pick(["posts", "comments", "all"] as const),
        ),
    ip_address: input?.ip_address ?? RandomGenerator.alphaNumeric(15),
    session_id:
      input?.session_id ?? typia.random<string & tags.Format<"uuid">>(),
    notes:
      input?.notes ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
    escalation_level:
      input?.escalation_level ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
      >(),
    review_required:
      input?.review_required ?? RandomGenerator.pick([true, false] as const),
    system_trigger:
      input?.system_trigger ??
      RandomGenerator.pick([
        "spam_detector",
        "hate_speech_classifier",
        "abuse_monitor",
        "moderation_bot",
      ] as const),
    suspension_code: input?.suspension_code ?? RandomGenerator.alphaNumeric(10),
    category:
      input?.category ??
      RandomGenerator.pick([
        "politics",
        "religion",
        "health",
        "finance",
        "education",
        "sports",
        "entertainment",
      ] as const),
    source_device:
      input?.source_device ??
      RandomGenerator.pick([
        "ios-17",
        "android-14",
        "web-chrome",
        "web-safari",
        "web-firefox",
      ] as const),
    location:
      input?.location ??
      RandomGenerator.pick([
        "Korea",
        "United States",
        "Canada",
        "Japan",
        "Germany",
        "Australia",
        "Brazil",
      ] as const),
    is_duplicate:
      input?.is_duplicate ?? RandomGenerator.pick([true, false] as const),
    suspension_priority:
      input?.suspension_priority ??
      RandomGenerator.pick(["low", "medium", "high", "critical"] as const),
    affected_channels: input?.affected_channels
      ? input.affected_channels
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5>
          >(),
          () => RandomGenerator.alphaNumeric(8),
        ),
    is_confirmed:
      input?.is_confirmed ?? RandomGenerator.pick([true, false] as const),
    is_provisional:
      input?.is_provisional ?? RandomGenerator.pick([true, false] as const),
    suspension_type:
      input?.suspension_type ??
      (input?.end_date !== undefined
        ? "temporary"
        : RandomGenerator.pick(["temporary", "permanent"] as const)),
    appeal_deadline:
      input?.appeal_deadline ??
      typia.random<string & tags.Format<"date-time">>(),
    moderator_affiliation:
      input?.moderator_affiliation ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 3 }),
    review_notes:
      input?.review_notes ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 4,
        wordMax: 8,
      }),
    review_status:
      input?.review_status ??
      RandomGenerator.pick([
        "pending",
        "approved",
        "rejected",
        "modified",
        "expired",
      ] as const),
    appeal_status:
      input?.appeal_status ??
      RandomGenerator.pick([
        "none",
        "pending",
        "accepted",
        "rejected",
        "reversed",
      ] as const),
    suspension_reason_category:
      input?.suspension_reason_category ??
      RandomGenerator.pick([
        "Harassment",
        "Disinformation",
        "Illegal Content",
        "Spam",
        "Impersonation",
        "Copyright Violation",
      ] as const),
    is_reviewer_assigned:
      input?.is_reviewer_assigned ??
      RandomGenerator.pick([true, false] as const),
    notification_timestamp:
      input?.notification_timestamp ??
      typia.random<string & tags.Format<"date-time">>(),
    suspension_version:
      input?.suspension_version ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
    review_comments:
      input?.review_comments ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1>
        >(),
        sentenceMin: 10,
        sentenceMax: 15,
      }),
    appeal_explanation:
      input?.appeal_explanation ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        sentenceMin: 5,
        sentenceMax: 8,
      }),
    modified_since:
      input?.modified_since ??
      typia.random<string & tags.Format<"date-time">>(),
    suspension_status:
      input?.suspension_status ??
      (input?.start_date
        ? new Date(input.start_date).getTime() > new Date().getTime()
          ? "pending"
          : input?.end_date &&
              new Date(input.end_date).getTime() < new Date().getTime()
            ? "expired"
            : input?.is_active !== undefined
              ? input.is_active
                ? "active"
                : "revoked"
              : "active"
        : "draft"),
    reviewer_id:
      input?.reviewer_id ?? typia.random<string & tags.Format<"uuid">>(),
    target_content:
      (input?.target_content ??
        RandomGenerator.substring(
          RandomGenerator.paragraph({ sentences: 5, wordMin: 6, wordMax: 8 }),
        )) ||
      RandomGenerator.alphaNumeric(150),
    reason_code: input?.reason_code ?? RandomGenerator.alphaNumeric(10),
    suspension_threshold:
      input?.suspension_threshold ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
    recurring_pattern:
      input?.recurring_pattern ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
    moderator_level:
      input?.moderator_level ??
      RandomGenerator.pick(["junior", "regular", "senior", "admin"] as const),
    appeal_record_id:
      input?.appeal_record_id ?? typia.random<string & tags.Format<"uuid">>(),
    related_moderation_action_id:
      input?.related_moderation_action_id ??
      typia.random<string & tags.Format<"uuid">>(),
    related_audit_event_id:
      input?.related_audit_event_id ??
      typia.random<string & tags.Format<"uuid">>(),
    related_compliance_record_id:
      input?.related_compliance_record_id ??
      typia.random<string & tags.Format<"uuid">>(),
    moderation_team_id:
      input?.moderation_team_id ?? typia.random<string & tags.Format<"uuid">>(),
    related_notification_id:
      input?.related_notification_id ??
      typia.random<string & tags.Format<"uuid">>(),
    related_audit_log_id:
      input?.related_audit_log_id ??
      typia.random<string & tags.Format<"uuid">>(),
    related_report_aggregation_id:
      input?.related_report_aggregation_id ??
      typia.random<string & tags.Format<"uuid">>(),
    related_report_id:
      input?.related_report_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}