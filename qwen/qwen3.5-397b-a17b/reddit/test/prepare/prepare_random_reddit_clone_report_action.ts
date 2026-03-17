import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_report_action(
  input?: DeepPartial<IRedditCloneReportAction.ICreate>,
): IRedditCloneReportAction.ICreate {
  return {
    action:
      input?.action ?? RandomGenerator.pick(["APPROVE", "DISMISS"] as const),
  };
}
