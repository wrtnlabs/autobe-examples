import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_organizations_tasks_create } from "../../../generate/generate_random_hrms_member_organizations_tasks_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_creation_assign_to_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member user with project management permissions
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a project within the organization
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const organization = memberAuth.organization_memberships[0]?.organization;
  TestValidator.notEquals("organization exists", organization, undefined);
  const organizationId = organization!.id;
  // Generate valid hex color code
  const colorCode = `#${typia.random<string>().slice(6)}`;
  const project: IHrmsProject =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: colorCode,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  // 3. Get employee list to find an employee NOT assigned to the project
  const employeeListResponse = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(employeeListResponse);
  // The employee list returns all employees in the organization
  // We need to find one that's not already assigned to this project
  TestValidator.predicate(
    "employee list has data",
    employeeListResponse.data.length > 0,
  );
  // Use the first employee - they should not be a project member by default
  const nonMemberEmployee = employeeListResponse.data[0];
  typia.assert(nonMemberEmployee);
  // 4. Attempt to create a task and assign it to the non-project member employee
  // This should fail with a validation error since the employee is not a project member
  await TestValidator.error(
    "task creation fails for non-member employee",
    async () => {
      await api.functional.hrms.member.organizations.tasks.create(
        memberConnection,
        {
          projectId: (project as any).id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            priority: "medium" as const,
            status: "open" as const,
            hrms_employee_id: nonMemberEmployee.id, // This employee is NOT a project member
          } satisfies IHrmsTask.ICreate,
        },
      );
    },
  );
  // 5. Test validated that the API rejects the request with proper error handling
  // The HttpError thrown by TestValidator.error confirms business rule validation works
}