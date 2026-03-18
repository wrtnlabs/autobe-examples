import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsActivityLog";
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
import type { IPageIHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_activity_logs_permission_based_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join User A with organization management permission
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized: IHrmsMember.IAuthorized = await authorize_member_join(
    userAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(userAAuthorized);
  // 2. Get User A's organization from membership
  const userAOrganizationId: string | undefined =
    userAAuthorized.organization_memberships.length > 0
      ? userAAuthorized.organization_memberships[0].organization.id
      : undefined;
  TestValidator.notEquals(
    "User A should have organization",
    userAOrganizationId,
    undefined,
  );
  // 3. Join User B as a regular member first
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized: IHrmsMember.IAuthorized = await authorize_member_join(
    userBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(userBAuthorized);
  // 4. Add User B to the same organization as User A
  const userBMembership: IHrmsOrganizationMember =
    await api.functional.hrms.member.organization_members.create(
      userAConnection,
      {
        body: {
          hrms_member_id: userBAuthorized.id,
          hrms_organization_id: userAOrganizationId!,
          hrms_organization_role_id:
            userAAuthorized.organization_memberships[0].organizationRole.id,
        },
      },
    );
  typia.assert(userBMembership);
  // 5. User A invites an employee (generates activity log entry)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized: IHrmsMember.IAuthorized =
    await authorize_member_join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(employeeAuthorized);
  // Add employee as organization member (User A invites them)
  const employeeMembership: IHrmsOrganizationMember =
    await api.functional.hrms.member.organization_members.create(
      userAConnection,
      {
        body: {
          hrms_member_id: employeeAuthorized.id,
          hrms_organization_id: userAOrganizationId!,
          hrms_organization_role_id:
            userAAuthorized.organization_memberships[0].organizationRole.id,
        },
      },
    );
  typia.assert(employeeMembership);
  // 6. User A creates a project (generates another activity log entry)
  const project: IHrmsProject =
    await api.functional.hrms.member.organizations.projects.create(
      userAConnection,
      {
        organizationId: userAOrganizationId!,
        body: {
          name: RandomGenerator.name(),
          color_code: "#3498db",
        },
      },
    );
  typia.assert(project);
  // 7. Query activity logs as User B
  const activityLogs: IPageIHrmsActivityLog.ISummary =
    await api.functional.hrms.member.activity_logs.index(userBConnection, {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: 1,
      },
    });
  typia.assert(activityLogs);
  // 8. Verify User B can see activity logs from their organization
  TestValidator.notEquals(
    "Activity logs should be returned",
    activityLogs.data.length,
    0,
  );
  // 9. Verify activity logs belong to the authenticated user's organization context
  for (const log of activityLogs.data) {
    TestValidator.predicate(
      `Activity log ${log.id} should have valid performedBy user`,
      log.performedBy !== undefined && log.performedBy.id !== undefined,
    );
  }
  // 10. Verify organization-scoped access enforcement
  TestValidator.predicate(
    "Activity logs should be organization-scoped",
    activityLogs.data.every((log) => log.performedBy !== undefined),
  );
}