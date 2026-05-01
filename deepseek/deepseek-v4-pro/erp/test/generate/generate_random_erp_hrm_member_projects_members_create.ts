import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_project_member } from "../prepare/prepare_random_erp_hrm_project_member";

/**
 * Generate a random ERP HRM project membership via the API for E2E testing.
 *
 * Prepares random project member data using the prepare function, then calls the project member creation endpoint to assign an employee to a project with a randomly selected role.
 *
 * The generated membership links an active employee to an active project within the current organization context. The role defaults to a random pick between "member" and "project-lead" when not explicitly overridden through the body parameter.
 *
 * The target project must exist and be in active status. The employee referenced by the generated UUID must already exist and be active within the same organization. Duplicate assignments for the same employee-project pair are rejected with a 409 Conflict.
 *
 * @param connection API connection to the target server
 * @param props.body Optional partial override for the project member creation data, allowing callers to target a specific employee or enforce a particular role
 * @param props.params Required URL parameters containing the UUID of the target project
 * @returns The newly created project membership record with all fields populated including the immutable joined_at timestamp
 */
export async function generate_random_erp_hrm_member_projects_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmProjectMember.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IErpHrmProjectMember> {
  const prepared: IErpHrmProjectMember.ICreate =
    prepare_random_erp_hrm_project_member(props.body);
  return await api.functional.erpHrm.member.projects.members.create(
    connection,
    {
      body: prepared,
      projectId: props.params.projectId,
    },
  );
}
