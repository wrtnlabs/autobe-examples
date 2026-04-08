import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

export async function test_api_timelog_retrieval_by_manager_with_view_all_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member account
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Get organization ID from manager's organizations (should be populated after join)
  const organizationId = managerAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Manager must belong to an organization");
  }
  // 3. Create a project in the organization (using manager's context)
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      managerConnection,
      {
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 4. Assign manager as project member
  // Get manager's employee ID from organizations array
  const managerEmployeeId = managerAuth.organizations?.[0]?.id;
  const managerProjectMember =
    await generate_random_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          employee_id:
            managerEmployeeId ?? typia.random<string & tags.Format<"uuid">>(),
          role: "member",
        } satisfies IHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(managerProjectMember);
  // 5. Assign employee as project member
  const employeeEmployeeId = employeeAuth.organizations?.[0]?.id;
  const employeeProjectMember =
    await generate_random_hrm_member_projects_members_create(
      employeeConnection,
      {
        body: {
          employee_id:
            employeeEmployeeId ?? typia.random<string & tags.Format<"uuid">>(),
          role: "member",
        } satisfies IHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(employeeProjectMember);
  // 6. Employee creates a timelog on the project
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      employeeConnection,
      {
        body: {
          hrm_project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          billable: true,
        } satisfies IHrmTimelog.ICreate,
        params: {
          organizationId: employeeAuth.organizations?.[0]?.id ?? organizationId,
        },
      },
    );
  typia.assert(timelog);
  // 7. Manager retrieves the employee's timelog by timelogId
  const retrievedTimelog = await api.functional.hrm.member.timelogs.at(
    managerConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 8. Validate the retrieved timelog matches the created one
  TestValidator.equals("timelog id matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "timelog date matches",
    retrievedTimelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "timelog duration matches",
    retrievedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "timelog project matches",
    retrievedTimelog.project.id,
    timelog.project.id,
  );
  TestValidator.predicate(
    "timelog is billable",
    retrievedTimelog.billable === true,
  );
}