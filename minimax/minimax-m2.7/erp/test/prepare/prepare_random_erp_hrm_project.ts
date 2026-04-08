import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_project(
  input?: DeepPartial<IErpHrmProject.ICreate>,
): IErpHrmProject.ICreate {
  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  // Generate a random hex color
  const generateColor = (): string => {
    const hex = RandomGenerator.alphabets(6).toUpperCase();
    return `#${hex}`;
  };
  return {
    budgetHours:
      input?.budgetHours ??
      (Math.random() > 0.3
        ? typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
          >()
        : null),
    color: input?.color ?? generateColor(),
    description:
      input?.description ??
      (Math.random() > 0.5
        ? RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          })
        : null),
    endDate:
      input?.endDate ??
      (Math.random() > 0.5
        ? formatDate(
            RandomGenerator.date(new Date(), 365 * 24 * 60 * 60 * 1000),
          )
        : null),
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 1 }),
    startDate:
      input?.startDate ??
      (Math.random() > 0.5
        ? formatDate(RandomGenerator.date(new Date(), 30 * 24 * 60 * 60 * 1000))
        : null),
    status:
      input?.status ??
      RandomGenerator.pick(["active", "archived", "completed"] as const),
  };
}
