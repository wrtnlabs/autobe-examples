import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_project_member(
  input?: DeepPartial<IHrmPlatformProjectMember.ICreate>,
): IHrmPlatformProjectMember.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
