import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_report(
  input?: DeepPartial<IRedditPlatformReport.ICreate>,
): IRedditPlatformReport.ICreate {
  return {
    reported_type:
      input?.reported_type ??
      RandomGenerator.pick(["POST", "COMMENT"] as const),
    reported_id:
      input?.reported_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
