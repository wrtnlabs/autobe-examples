import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

export async function test_api_project_membership_role_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create initial membership with 'member' role
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: typia.random<string & tags.Format<"uuid">>(),
          role: "member",
        },
      },
    );
  typia.assert(membership);
  // Store original timestamps for comparison
  const originalCreatedAt = membership.created_at;
  const originalUpdatedAt = membership.updated_at;
  // 4. Update membership role to 'project-lead'
  const updatedMembership =
    await api.functional.hrmPlatform.member.projects.memberships.update(
      memberConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: {
          role: "project-lead",
        } satisfies IHrmPlatformProjectMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership);
  // 5. Validate the updated membership
  TestValidator.equals(
    "role updated to project-lead",
    updatedMembership.role,
    "project-lead",
  );
  TestValidator.equals(
    "membership ID unchanged",
    updatedMembership.id,
    membership.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedMembership.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is after original",
    new Date(updatedMembership.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedMembership.deleted_at,
    null,
  );
  // 6. Validate nested employee and project references exist
  TestValidator.predicate(
    "employee reference exists",
    updatedMembership.employee.id !== undefined,
  );
  TestValidator.predicate(
    "project reference exists",
    updatedMembership.project.id !== undefined,
  );
  TestValidator.equals(
    "project ID matches",
    updatedMembership.project.id,
    project.id,
  );
}
