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
import { generate_random_hrms_member_organizations_roles_create } from "../../../generate/generate_random_hrms_member_organizations_roles_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_organization_role } from "../../../prepare/prepare_random_hrms_organization_role";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_timelog_deletion_with_time_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. Get organization ID from owner's membership
  const ownerOrgId =
    ownerAuthorized.organization_memberships[0].organization.id;
  // 3. Create manager role with time:manage permission
  const managerRole =
    await api.functional.hrms.member.organizations.roles.create(
      ownerConnection,
      {
        organizationId: ownerOrgId,
        body: {
          name: "Time Manager",
          permissions: ["time:manage", "time:view_all"],
        } satisfies IHrmsOrganizationRole.ICreate,
      },
    );
  typia.assert(managerRole);
  // 4. Create manager member with separate connection
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuthorized = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(managerAuthorized);
  // Add manager to organization with time:manage role
  await api.functional.hrms.member.organization_members.create(
    ownerConnection,
    {
      body: {
        hrms_member_id: managerAuthorized.id,
        hrms_organization_id: ownerOrgId,
        hrms_organization_role_id: managerRole.id,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  // 5. Create project for timelog
  const projectResponse =
    await api.functional.hrms.member.organizations.projects.create(
      ownerConnection,
      {
        organizationId: ownerOrgId,
        body: {
          name: RandomGenerator.name(2),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmsProject.ICreate,
      },
    );
  // Extract project id from response
  const projectId = (
    typia.assert<unknown>(projectResponse) as {
      id: string;
    }
  ).id;
  // 6. Create regular employee member
  const regularEmployeeConnection: api.IConnection = { host: connection.host };
  const regularEmployeeAuthorized = await authorize_member_join(
    regularEmployeeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(regularEmployeeAuthorized);
  // Add regular employee to organization with the same role (simplified test)
  await api.functional.hrms.member.organization_members.create(
    ownerConnection,
    {
      body: {
        hrms_member_id: regularEmployeeAuthorized.id,
        hrms_organization_id: ownerOrgId,
        hrms_organization_role_id: managerRole.id,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  // 7. Regular employee creates a timelog
  const timelogResponse =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      regularEmployeeConnection,
      {
        organizationId: ownerOrgId,
        employeeId: regularEmployeeAuthorized.id,
        body: {
          date: new Date().toISOString(),
          duration_minutes: 120,
          project_id: projectId,
          description: "Test work session",
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  // Extract timelog id from response
  const timelogId = (
    typia.assert<unknown>(timelogResponse) as {
      id: string;
    }
  ).id;
  // 8. Manager WITH time:manage CAN delete another employee's timelog
  await api.functional.hrms.member.timelogs.erase(managerConnection, {
    timelogId,
  });
}
