import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_department(
  input?: DeepPartial<IHrmsDepartment.ICreate> | undefined,
): IHrmsDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    parentDepartmentId: input?.parentDepartmentId
      ? input.parentDepartmentId
      : typia.random<string & tags.Format<"uuid">>(),
  };
}
