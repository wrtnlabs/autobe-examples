import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_report(
  input?: DeepPartial<IRedditReport.ICreate>,
): IRedditReport.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.content({ paragraphs: 1 }),
  };
}
