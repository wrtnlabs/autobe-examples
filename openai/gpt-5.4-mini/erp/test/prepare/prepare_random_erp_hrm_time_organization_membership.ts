import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_organization_membership(
  input?: DeepPartial<IErpHrmTimeOrganizationMembership.ICreate> | undefined,
): IErpHrmTimeOrganizationMembership.ICreate {
  return {
    employeeId:
      input?.employeeId ?? typia.random<string & tags.Format<"uuid">>(),
    roleId: input?.roleId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
