import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_timelog_view_own_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration (creates organization automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract organization from auth response
  TestValidator.equals(
    "member has organization memberships",
    authorized.organization_memberships.length > 0,
    true,
  );
  const orgMembership = authorized.organization_memberships[0];
  const orgId = orgMembership.organization.id;
  // 3. Create project in organization
  const projectConnection: api.IConnection = { host: connection.host };
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      projectConnection,
      {
        organizationId: orgId,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: RandomGenerator.alphaNumeric(7),
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  const projectId = (
    project as unknown as {
      id: string;
    }
  ).id;
  // 4. Create timelog entry
  const timelogDate = new Date().toISOString();
  const timelog =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      projectConnection,
      {
        organizationId: orgId,
        employeeId: orgMembership.member.id,
        body: {
          date: timelogDate,
          duration_minutes: 120,
          project_id: projectId,
          task_id: null,
          description: "Test work description",
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  const timelogId = (
    timelog as unknown as {
      id: string;
    }
  ).id;
  // 5. Retrieve timelog entry
  const retrievedTimelog = await api.functional.hrms.member.timelogs.at(
    projectConnection,
    {
      timelogId: timelogId,
    },
  );
  typia.assert(retrievedTimelog);
  // 6. Validate timelog was retrieved successfully
  TestValidator.equals(
    "timelog response received",
    retrievedTimelog !== undefined,
    true,
  );
}
