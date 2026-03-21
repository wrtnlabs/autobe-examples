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

export async function test_api_project_member_access_denied_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member who owns the organization and has full permissions
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstMember);
  // Step 2: Create a project using first member's connection (owner has project:manage permission)
  const project = await generate_random_erp_hrm_member_projects_create(
    firstMemberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create second member (becomes owner of a separate organization by default)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondMember);
  // Step 4: Get the first member's employee ID by creating an employee record
  // The first member (as org owner) creates an employee record for themselves
  const firstEmployee = await generate_random_erp_hrm_member_employees_create(
    firstMemberConnection,
    {
      body: {
        email: firstMember.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(firstEmployee);
  // Step 5: Assign first member to the project as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      firstMemberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: firstEmployee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 6: Attempt to view project membership with second member (different organization)
  // Expected: HTTP 403 Forbidden - user cannot view project membership in another organization
  await TestValidator.httpError(
    "access denied for member from different organization",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.members.at(
        secondMemberConnection,
        {
          projectId: project.id,
          projectMemberId: projectMember.id,
        },
      );
    },
  );
}
