import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_project_membership } from "../prepare/prepare_random_hrm_platform_project_membership";

/**
 * Generate a random project membership for E2E testing.
 *
 * Prepares project membership data using the prepare function, then calls the creation endpoint.
 * Assigns an active employee to a specified project with a capacity role (member or project-lead).
 * The system validates that the employee is active, belongs to the same organization, and is not already assigned to the project.
 */
export async function generate_random_hrm_platform_member_projects_memberships_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformProjectMembership.ICreate>;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmPlatformProjectMembership> {
  const prepared: IHrmPlatformProjectMembership.ICreate =
    prepare_random_hrm_platform_project_membership(props.body);
  const result: IHrmPlatformProjectMembership =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      connection,
      {
        body: prepared,
        projectId: props.params.projectId,
      },
    );
  return result;
}
