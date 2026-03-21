import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_removal_rejected_for_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member who becomes organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create second member who will be assigned as project_lead
  // We need their credentials to authenticate later
  const projectLeadPassword = RandomGenerator.alphaNumeric(16);
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadMember = await authorize_member_join(projectLeadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: projectLeadPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(projectLeadMember);
  // Step 3: Create third member who will be regular project member (target of removal)
  const targetMemberPassword = RandomGenerator.alphaNumeric(16);
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: targetMemberPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(targetMember);
  // Step 4: Create employee records for project lead and target member in owner's organization
  // Note: These members joined different organizations, so we need to create employee records
  // that link them to the owner's organization
  // Since authorize_member_join creates their own org, we need a different approach
  // The generate_random_erp_hrm_member_employees_create creates employees using emails
  // and links them to the authenticated user's organization
  // Create employee for project lead in owner's organization
  const projectLeadEmployee =
    await generate_random_erp_hrm_member_employees_create(ownerConnection, {
      body: {
        email: projectLeadMember.email,
        employmentType: "full_time",
        roleId: typia.random<string & tags.Format<"uuid">>(), // This needs valid role ID
      } satisfies IErpHrmEmployee.ICreate,
    });
  typia.assert(projectLeadEmployee);
  // Create employee for target member in owner's organization
  const targetEmployee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: targetMember.email,
        employmentType: "full_time",
        roleId: typia.random<string & tags.Format<"uuid">>(), // This needs valid role ID
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(targetEmployee);
  // Step 5: Create an active project using owner connection
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Step 6: Assign project lead employee as 'project_lead' role to the project
  const projectLeadMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: projectLeadEmployee.id,
          role: "project_lead",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectLeadMembership);
  // Step 7: Assign target employee as regular 'member' role to the project
  const targetMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: targetEmployee.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(targetMembership);
  // Step 8: Attempt to remove the target member as project lead - should be rejected with 403
  await TestValidator.httpError(
    "project lead should not be able to remove project members",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.members.erase(
        projectLeadConnection,
        {
          projectId: project.id,
          projectMemberId: targetMembership.id,
        },
      );
    },
  );
}
