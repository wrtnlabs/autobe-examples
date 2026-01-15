import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
export function prepare_random_community_platform_report_tracking(
  input?: DeepPartial<ICommunityPlatformReportTracking.ICreate>,
): ICommunityPlatformReportTracking.ICreate {
  return {
    report_reason:
      input?.report_reason ??
      RandomGenerator.pick([
        "hate_speech",
        "harassment",
        "spam",
        "misinformation",
        "copyright_violation",
        "impersonation",
      ] as const),
    reported_content_id: typia.random<string & tags.Format<"uuid">>(),
    reported_by_actor_id: typia.random<string & tags.Format<"uuid">>(),
    priority_level: RandomGenerator.pick([
      "low",
      "normal",
      "high",
      "urgent",
    ] as const),
    reported_content_type:
      input?.reported_content_type ??
      RandomGenerator.pick([
        "post",
        "comment",
        "message",
        "product_review",
        "question",
        "answer",
      ] as const),
    initial_assessment:
      input?.initial_assessment ??
      RandomGenerator.pick(["accepted", "rejected", "pending"] as const),
    assigned_moderator_id:
      input?.assigned_moderator_id ??
      typia.random<string & tags.Format<"uuid">>(),
    notes:
      input?.notes ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
