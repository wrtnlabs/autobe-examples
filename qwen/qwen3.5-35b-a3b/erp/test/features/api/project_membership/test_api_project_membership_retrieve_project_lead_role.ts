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

export async function test_api_project_membership_retrieve_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  typia.assert(joinResult.member);
  typia.assert(joinResult.token);
  // 2. Create project within the organization
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create project membership with project_lead role
  const membership =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: joinResult.member.id,
          role: "project_lead" as const,
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  // 4. Retrieve the membership
  const retrievedMembership =
    await api.functional.hrmPlatform.member.projects.memberships.at(
      memberConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
      },
    );
  typia.assert(retrievedMembership);
  // 5. Validate retrieved membership
  TestValidator.equals(
    "membership id matches",
    retrievedMembership.id,
    membership.id,
  );
  TestValidator.equals(
    "role is project_lead",
    retrievedMembership.role,
    "project_lead",
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedMembership.deleted_at,
    null,
  );
  typia.assert(retrievedMembership.created_at);
  typia.assert(retrievedMembership.updated_at);
  // Validate employee reference
  typia.assert(retrievedMembership.employee);
  TestValidator.equals(
    "employee_id matches",
    retrievedMembership.employee.id,
    joinResult.member.id,
  );
  TestValidator.equals(
    "employee_code exists",
    retrievedMembership.employee.employee_code.length > 0,
    true,
  );
  TestValidator.equals(
    "employee email matches",
    retrievedMembership.employee.email,
    joinResult.member.email,
  );
  TestValidator.equals(
    "employee display_name matches",
    retrievedMembership.employee.display_name,
    joinResult.member.display_name,
  );
  TestValidator.predicate(
    "employee phone number present",
    retrievedMembership.employee.phone_number !== undefined,
  );
  TestValidator.equals(
    "employee job_level exists",
    retrievedMembership.employee.job_level.length > 0,
    true,
  );
  TestValidator.equals(
    "employee employment_type exists",
    retrievedMembership.employee.employment_type.length > 0,
    true,
  );
  TestValidator.equals(
    "employee status exists",
    retrievedMembership.employee.status.length > 0,
    true,
  );
  typia.assert(retrievedMembership.employee.start_date);
  // Validate project reference
  typia.assert(retrievedMembership.project);
  TestValidator.equals(
    "project_id matches",
    retrievedMembership.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedMembership.project.name,
    project.name,
  );
  TestValidator.equals(
    "project status exists",
    retrievedMembership.project.status.length > 0,
    true,
  );
  TestValidator.equals(
    "project color_code matches",
    retrievedMembership.project.color_code,
    project.color_code,
  );
  typia.assert(retrievedMembership.project.created_at);
  typia.assert(retrievedMembership.project.updated_at);
  TestValidator.equals(
    "project total_hours is non-negative",
    retrievedMembership.project.total_hours >= 0,
    true,
  );
  TestValidator.equals(
    "project billable_hours is non-negative",
    retrievedMembership.project.billable_hours >= 0,
    true,
  );
  TestValidator.equals(
    "project timelog_count is non-negative",
    retrievedMembership.project.timelog_count >= 0,
    true,
  );
  TestValidator.equals(
    "project employee_count is non-negative",
    retrievedMembership.project.employee_count >= 0,
    true,
  );
  // Validate organization context
  TestValidator.equals(
    "organization_id is present",
    retrievedMembership.organization_id.length > 0,
    true,
  );
  typia.assert(joinResult.member);
}
