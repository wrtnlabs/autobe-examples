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
    organizationMemberId:
      input?.organizationMemberId ??
      typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
