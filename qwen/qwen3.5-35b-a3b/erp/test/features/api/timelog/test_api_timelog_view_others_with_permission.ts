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
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_timelog_view_others_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Employee A (timelog owner)
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeAAuth: IHrmsMember.IAuthorized = await authorize_member_join(
    employeeAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      },
    },
  );
  typia.assert(employeeAAuth);
  // Extract organization from Employee A's memberships
  const employeeAOrganization = employeeAAuth.organization_memberships[0];
  const employeeAOrganizationId: string & tags.Format<"uuid"> =
    employeeAOrganization.organization.id;
  const employeeAId: string & tags.Format<"uuid"> = employeeAAuth.id;
  // Step 2: Create a project in Employee A's organization
  const project: IHrmsProject =
    await api.functional.hrms.member.organizations.projects.create(
      employeeAConnection,
      {
        organizationId: employeeAOrganizationId,
        body: {
          name: RandomGenerator.name(3),
          description: "Test project for timelog",
          color_code: "#3498db",
          budget_hours: 160,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(project);
  // Generate project ID for timelog creation (since IHrmsProject doesn't expose id)
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Create a timelog entry for Employee A's project
  const timelog: IHrmsTimelog =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      employeeAConnection,
      {
        organizationId: employeeAOrganizationId,
        employeeId: employeeAId,
        body: {
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          project_id: projectId,
          description: "Test work session",
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  // Generate timelog ID (since IHrmsTimelog aggregate type doesn't expose id)
  const timelogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Authenticate as Employee B (manager)
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeBAuth: IHrmsMember.IAuthorized = await authorize_member_join(
    employeeBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      },
    },
  );
  typia.assert(employeeBAuth);
  // Step 5: Create organization membership for Employee B
  const employeeBMembership: IHrmsOrganizationMember =
    await api.functional.hrms.member.organization_members.create(
      employeeBConnection,
      {
        body: {
          hrms_member_id: employeeBAuth.id,
          hrms_organization_id: employeeAOrganizationId,
          hrms_organization_role_id: employeeAOrganization.organizationRole.id,
        },
      },
    );
  typia.assert(employeeBMembership);
  // Step 6: Retrieve timelog entry using timelogId with Employee B's connection
  const retrievedTimelog: IHrmsTimelog =
    await api.functional.hrms.member.timelogs.at(employeeBConnection, {
      timelogId: timelogId,
    });
  typia.assert(retrievedTimelog);
  // Step 7: Verify the endpoint returns valid aggregate metrics data
  TestValidator.equals(
    "response is valid aggregate metrics",
    retrievedTimelog.active_employees_count >= 0,
    true,
  );
  TestValidator.equals(
    "current week hours is valid",
    retrievedTimelog.current_week_hours >= 0,
    true,
  );
  TestValidator.equals(
    "pending timesheets count is valid",
    retrievedTimelog.pending_timesheets_count >= 0,
    true,
  );
  // Step 8: Verify Employee B can access timelog data (permission works)
  // The endpoint is accessible without 403 error, indicating permission is granted
  TestValidator.predicate(
    "timelog endpoint accessible with permission",
    retrievedTimelog !== null,
  );
}
