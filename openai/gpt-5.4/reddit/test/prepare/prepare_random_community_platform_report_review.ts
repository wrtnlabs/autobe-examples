import { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report_review(
  input?: DeepPartial<ICommunityPlatformReportReview.ICreate>,
): ICommunityPlatformReportReview.ICreate {
  return {
    review_action:
      input?.review_action ??
      RandomGenerator.pick([
        "approve",
        "reject",
        "dismiss",
        "escalate",
      ] as const),
    note:
      input?.note !== undefined
        ? input.note
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
