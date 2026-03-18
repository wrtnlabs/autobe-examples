import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_project(
  input?: DeepPartial<IHrmPlatformProject.ICreate>,
): IHrmPlatformProject.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    description:
      input?.description ??
      (Math.random() > 0.3
        ? RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          })
        : null),
    color_code:
      input?.color_code ?? `#${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
    status:
      input?.status ??
      RandomGenerator.pick(["active", "archived", "completed"] as const),
    budget_hours:
      input?.budget_hours ??
      (Math.random() > 0.3
        ? typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<10000>
          >()
        : null),
    started_at:
      input?.started_at ??
      (Math.random() > 0.3
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
    ended_at:
      input?.ended_at ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
  };
}
