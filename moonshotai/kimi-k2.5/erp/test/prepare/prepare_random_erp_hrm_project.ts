import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_project(
  input?: DeepPartial<IErpHrmProject.ICreate>,
): IErpHrmProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    colorCode: input?.colorCode ?? `#${RandomGenerator.alphaNumeric(6)}`,
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    status:
      input?.status ??
      RandomGenerator.pick(["active", "archived", "completed"] as const),
    budgetHours:
      input?.budgetHours ?? typia.random<number & tags.ExclusiveMinimum<0>>(),
    startDate:
      input?.startDate ??
      RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 365).toISOString(),
    endDate:
      input?.endDate ??
      RandomGenerator.date(
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        1000 * 60 * 60 * 24 * 365,
      ).toISOString(),
  };
}
