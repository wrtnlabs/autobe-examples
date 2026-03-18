import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_organization_member(
  input?: DeepPartial<IErpHrmOrganizationMember.ICreate> | undefined,
): IErpHrmOrganizationMember.ICreate {
  return {
    memberId: input?.memberId ?? typia.random<string & tags.Format<"uuid">>(),
    roleId: input?.roleId ?? typia.random<string & tags.Format<"uuid">>(),
    employmentType:
      input?.employmentType ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
    departmentId:
      input?.departmentId !== undefined
        ? input.departmentId
        : typia.random<string & tags.Format<"uuid">>(),
    position:
      input?.position !== undefined
        ? input.position
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
