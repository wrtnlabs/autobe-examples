import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
export function prepare_random_community_platform_report(
  input?: DeepPartial<ICommunityPlatformReport.ICreate>,
): ICommunityPlatformReport.ICreate {
  return {
    event_type: RandomGenerator.pick([
      "content_flag",
      "moderation_action",
      "spam_detected",
      "security_alert",
      "system_anomaly",
    ] as const),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    content_identifier: typia.random<string & tags.Format<"uuid">>(),
    related_user_id:
      input?.related_user_id ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined),
    report_description:
      input?.report_description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    system_source: input?.system_source ?? RandomGenerator.alphaNumeric(10),
    metadata: input?.metadata ?? undefined,
    action_taken:
      input?.action_taken ?? RandomGenerator.pick([true, false] as const),
  };
}