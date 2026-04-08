import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_project_member } from "../prepare/prepare_random_hrm_project_member";

/**
 * Generate a random project member assignment via the API for E2E testing.
 *
 * Prepares random project member data using the prepare function, then calls the creation endpoint to assign an employee to a project with a specific role.
 *
 * This function creates a project membership record that links an employee to a project. The employee must belong to the same organization as the project, and cannot already be assigned to this project due to the unique constraint on project-employee pairs.
 *
 * @param connection The HTTP connection configuration for API calls
 * @param props.body Optional partial input to override specific fields in the project member creation data
 * @param props.params.projectId Unique identifier of the project to assign the employee to (global scope)
 * @returns The created project membership record with all fields including generated id and timestamps
 */
export async function generate_random_hrm_member_projects_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmProjectMember.ICreate>;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmProjectMember> {
  const prepared: IHrmProjectMember.ICreate = prepare_random_hrm_project_member(
    props.body,
  );
  const result: IHrmProjectMember =
    await api.functional.hrm.member.projects.members.create(connection, {
      projectId: props.params.projectId,
      body: prepared,
    });
  return result;
}
