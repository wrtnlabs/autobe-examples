import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_report_resolution(
  input?: DeepPartial<IRedditPlatformReportResolution.ICreate>,
): IRedditPlatformReportResolution.ICreate {
  return {
    report_id: input?.report_id ?? typia.random<string & tags.Format<"uuid">>(),
    status:
      input?.status ?? RandomGenerator.pick(["RESOLVED", "DISMISSED"] as const),
    resolution_notes:
      input?.resolution_notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
