import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMembership";
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

/**
 * Test retrieval of all active project memberships for a specific project.
 *
 * Validates the complete workflow for listing project memberships including
 * member registration, project creation, role assignment, and membership listing.
 * Ensures that the pagination and membership records are correctly structured
 * with complete employee information and proper role assignments.
 *
 * 1. Create two member accounts via member registration endpoint to establish
 *    authentication and organization context.
 * 2. Create a project within the organization using the first member's connection.
 * 3. Assign both employees to the project with different roles ('member' and
 *    'project_lead').
 * 4. Retrieve all active memberships for the project via the list endpoint.
 * 5. Validate pagination metadata, record count, data structure, and role values.
 */
export async function test_api_project_membership_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account (will be organization Owner)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(firstMember);
  typia.assert(firstMember.member);
  // 2. Create second member account in same organization context
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(secondMember);
  typia.assert(secondMember.member);
  // 3. Create project using first member's connection
  const project = await generate_random_hrm_platform_member_projects_create(
    firstMemberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(project);
  // 4. Assign first employee (from first member) as 'member' role
  const membership1 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      firstMemberConnection,
      {
        body: {
          employee_id: firstMember.member.id,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership1);
  // 5. Assign second employee (from second member) as 'project_lead' role
  const membership2 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      firstMemberConnection,
      {
        body: {
          employee_id: secondMember.member.id,
          role: "project_lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership2);
  // 6. Retrieve all active memberships for the project
  const listConnection: api.IConnection = { host: connection.host };
  const listResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      listConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(listResponse);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    listResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    listResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records equals 2",
    listResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages equals 1",
    listResponse.pagination.pages,
    1,
  );
  // 8. Validate data array structure and record count
  TestValidator.equals(
    "data array length equals 2",
    listResponse.data.length,
    2,
  );
  // 9. Validate each membership record
  const memberMembership = listResponse.data.find((m) => m.role === "member");
  TestValidator.notEquals(
    "member role membership exists",
    memberMembership,
    undefined,
  );
  if (memberMembership) {
    typia.assert(memberMembership);
    TestValidator.notEquals(
      "member role membership employee",
      memberMembership.employee,
      null,
    );
    TestValidator.notEquals(
      "member role membership project",
      memberMembership.project,
      null,
    );
    TestValidator.equals(
      "member role membership role",
      memberMembership.role,
      "member",
    );
    TestValidator.notEquals(
      "member role membership id not null",
      memberMembership.id,
      null,
    );
    TestValidator.equals(
      "member role membership deleted_at is null",
      memberMembership.deleted_at,
      null,
    );
    // Validate employee information
    TestValidator.notEquals(
      "employee id present",
      memberMembership.employee.id,
      null,
    );
    TestValidator.notEquals(
      "employee employee_code present",
      memberMembership.employee.employee_code,
      null,
    );
    TestValidator.notEquals(
      "employee display_name present",
      memberMembership.employee.display_name ?? null,
      null,
    );
    TestValidator.notEquals(
      "employee email present",
      memberMembership.employee.email,
      null,
    );
  }
  const projectLeadMembership = listResponse.data.find(
    (m) => m.role === "project_lead",
  );
  TestValidator.notEquals(
    "project_lead role membership exists",
    projectLeadMembership,
    undefined,
  );
  if (projectLeadMembership) {
    typia.assert(projectLeadMembership);
    TestValidator.notEquals(
      "project_lead role membership employee",
      projectLeadMembership.employee,
      null,
    );
    TestValidator.notEquals(
      "project_lead role membership project",
      projectLeadMembership.project,
      null,
    );
    TestValidator.equals(
      "project_lead role membership role",
      projectLeadMembership.role,
      "project_lead",
    );
    TestValidator.notEquals(
      "project_lead role membership id not null",
      projectLeadMembership.id,
      null,
    );
    TestValidator.equals(
      "project_lead role membership deleted_at is null",
      projectLeadMembership.deleted_at,
      null,
    );
    // Validate employee information
    TestValidator.notEquals(
      "employee id present",
      projectLeadMembership.employee.id,
      null,
    );
    TestValidator.notEquals(
      "employee employee_code present",
      projectLeadMembership.employee.employee_code,
      null,
    );
    TestValidator.notEquals(
      "employee display_name present",
      projectLeadMembership.employee.display_name ?? null,
      null,
    );
    TestValidator.notEquals(
      "employee email present",
      projectLeadMembership.employee.email,
      null,
    );
  }
}