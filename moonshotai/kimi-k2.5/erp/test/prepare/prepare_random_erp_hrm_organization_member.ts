import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_organization_member(
  input?: DeepPartial<IErpHrmOrganizationMember.ICreate>,
): IErpHrmOrganizationMember.ICreate {
  return {
    organizationId:
      input?.organizationId ?? typia.random<string & tags.Format<"uuid">>(),
    userId: input?.userId ?? typia.random<string & tags.Format<"uuid">>(),
    roleId: input?.roleId ?? typia.random<string & tags.Format<"uuid">>(),
    departmentId: input?.departmentId ?? null,
    position: input?.position ?? RandomGenerator.paragraph({ sentences: 1 }),
    employmentType:
      input?.employmentType ??
      RandomGenerator.pick([
        "full_time",
        "part_time",
        "contractor",
        "intern",
      ] as const),
    isActive: input?.isActive ?? RandomGenerator.pick([true, false]),
  };
}
