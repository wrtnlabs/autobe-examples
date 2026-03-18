import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import type { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import type { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import type { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import type { IPageIHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";

export async function test_api_project_tasks_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create connection with authorization token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: authorized.token.access,
  };
  // 3. Retrieve organizations
  const organizations = await api.functional.hrms.member.organizations.index(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(organizations);
  TestValidator.predicate("has organizations", organizations.data.length > 0);
  const targetOrg = organizations.data[0];
  // 4. Generate a project UUID for testing
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // 5. Add member as project lead
  const projectLead =
    await generate_random_hrms_member_projects_members_add_member(
      userConnection,
      {
        body: {
          employee_id: authorized.id,
          role: "project-lead",
        },
        params: { projectId },
      },
    );
  typia.assert(projectLead);
  TestValidator.equals(
    "role is project-lead",
    projectLead.role,
    "project-lead",
  );
  // 6. Call the endpoint to retrieve all tasks
  const allTasks = await api.functional.hrms.member.projects.tasks.index(
    userConnection,
    {
      projectId,
      body: {},
    },
  );
  typia.assert(allTasks);
  TestValidator.equals(
    "pagination records non-negative",
    allTasks.pagination.records >= 0,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    allTasks.pagination.current >= 1,
  );
  // 7. Test filtering by project IDs
  const filteredByProject =
    await api.functional.hrms.member.projects.tasks.index(userConnection, {
      projectId,
      body: {
        projectIds: [projectId] satisfies (string & tags.Format<"uuid">)[],
      },
    });
  typia.assert(filteredByProject);
  // 8. Test pagination - page 1
  const page1 = await api.functional.hrms.member.projects.tasks.index(
    userConnection,
    {
      projectId,
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  // 9. Test pagination - page 2
  const page2 = await api.functional.hrms.member.projects.tasks.index(
    userConnection,
    {
      projectId,
      body: {
        page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 10. Test empty result set
  const emptyFilter = await api.functional.hrms.member.projects.tasks.index(
    userConnection,
    {
      projectId,
      body: {
        status: ["closed"] satisfies IHrmsTaskStatusHistory[],
      },
    },
  );
  typia.assert(emptyFilter);
  TestValidator.equals("empty result data array", emptyFilter.data.length, 0);
  TestValidator.equals(
    "empty result pagination",
    emptyFilter.pagination.records,
    0,
  );
}
