import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM project member creation data for E2E testing.
 *
 * Generates a complete IErpHrmProjectMember.ICreate with a random employee UUID
 * and a randomly selected role. The role defaults to a random pick between
 * "member" and "project-lead" when not explicitly provided.
 *
 * The employee ID is generated as a random UUID, suitable for referencing an
 * existing employee record created in prior test steps. Callers can override
 * either property via the DeepPartial input to target specific employees or
 * enforce a particular role.
 */
export function prepare_random_erp_hrm_project_member(
  input?: DeepPartial<IErpHrmProjectMember.ICreate> | undefined,
): IErpHrmProjectMember.ICreate {
  return {
    erp_hrm_employee_id:
      input?.erp_hrm_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
