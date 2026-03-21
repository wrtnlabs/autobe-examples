import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_project_member(
  input?: DeepPartial<IErpHrmProjectMember.ICreate>,
): IErpHrmProjectMember.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    color: input?.color ?? `#${RandomGenerator.alphabets(6).toUpperCase()}`,
    status:
      input?.status ??
      RandomGenerator.pick(["active", "archived", "completed"] as const),
    budget_hours:
      input?.budget_hours ?? typia.random<number & tags.Minimum<0>>(),
    start_date:
      input?.start_date ??
      RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 365).toISOString(),
    end_date:
      input?.end_date ??
      RandomGenerator.date(
        new Date(),
        1000 * 60 * 60 * 24 * 365 * 2,
      ).toISOString(),
  };
}
