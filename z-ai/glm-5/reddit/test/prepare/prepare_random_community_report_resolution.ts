import { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_report_resolution(
  input?: DeepPartial<ICommunityReportResolution.ICreate>,
): ICommunityReportResolution.ICreate {
  return {
    action:
      input?.action ?? RandomGenerator.pick(["APPROVE", "DISMISS"] as const),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
