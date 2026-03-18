import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_project_member(
  input?: DeepPartial<IHrmsProjectMember.ICreate>,
): IHrmsProjectMember.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
