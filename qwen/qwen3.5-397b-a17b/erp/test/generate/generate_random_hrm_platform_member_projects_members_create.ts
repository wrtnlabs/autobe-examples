import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_project_member } from "../prepare/prepare_random_hrm_platform_project_member";

/**
 * Generate a random HRM platform project member via the API for E2E testing.
 *
 * Prepares random project member data using the prepare function, then calls the
 * project member creation endpoint. The employee is assigned to the specified
 * project with a randomly selected role ('member' or 'project-lead').
 *
 * This function requires a projectId URL parameter to specify which project the
 * employee should be assigned to. The prepare function generates a random employee
 * UUID and role, which can be overridden via the body props for specific test scenarios.
 *
 * @param connection - API connection configuration for the test
 * @param props.body - Optional partial data to override random generation
 * @param props.params.projectId - UUID of the project to assign the employee to
 * @returns The created project membership record with employee, project, and role
 */
export async function generate_random_hrm_platform_member_projects_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformProjectMember.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmPlatformProjectMember> {
  const prepared: IHrmPlatformProjectMember.ICreate =
    prepare_random_hrm_platform_project_member(props.body);
  const result: IHrmPlatformProjectMember =
    await api.functional.hrmPlatform.member.projects.members.create(
      connection,
      {
        projectId: props.params.projectId,
        body: prepared,
      },
    );
  return result;
}
