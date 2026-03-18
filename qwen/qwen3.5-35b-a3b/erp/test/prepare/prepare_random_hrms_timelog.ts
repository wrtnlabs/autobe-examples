import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_timelog(
  input?: DeepPartial<IHrmsTimelog.ICreate>,
): IHrmsTimelog.ICreate {
  const today = new Date();
  const oneMonth = 30 * 24 * 60 * 60 * 1000;
  return {
    date: input?.date ?? RandomGenerator.date(today, -oneMonth)?.toISOString() ?? RandomGenerator.date(today, oneMonth)?.toISOString(),
    duration_minutes:
      input?.duration_minutes ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<15> & tags.Maximum<1440>
      >(),
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id:
      input?.task_id ??
      (Math.random() > 0.3
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    billable: input?.billable ?? typia.random<boolean>(),
  };
}