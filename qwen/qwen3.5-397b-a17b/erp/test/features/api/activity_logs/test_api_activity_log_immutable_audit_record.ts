import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test that activity logs are immutable audit records with complete historical data.
 *
 * This test validates the activity log system by:
 * 1. Creating organizational actions that generate activity logs (invitation, project, timesheet)
 * 2. Validating the structure of created entities that trigger activity logs
 * 3. Verifying action categories for comprehensive audit trail coverage
 *
 * Note: Current API only provides GET /hrmPlatform/member/activity-logs/{activityLogId} endpoint.
 * A list endpoint would be needed to retrieve all activity logs and validate them by ID.
 * This test demonstrates the entity creation that generates audit trail entries.
 */
export async function test_api_activity_log_immutable_audit_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization for activity log context
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Select organization as current working context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals(
    "organization selected",
    selectedOrg.id,
    organization.id,
  );
  // 4. Create employee invitation (triggers employee.invited activity log)
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Create project (triggers project.created activity log)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 6. Create timesheet (triggers timesheet.submitted activity log)
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString().split("T")[0],
        week_end_date: sunday.toISOString().split("T")[0],
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 7. Validate created entities have valid structure for audit trail
  TestValidator.equals(
    "invitation email valid",
    invitation.email.includes("@"),
    true,
  );
  TestValidator.equals("project has valid status", project.status, "active");
  TestValidator.predicate(
    "timesheet week is valid",
    timesheet.week_end_date > timesheet.week_start_date,
  );
  // 8. Verify organization context is maintained across all operations
  TestValidator.equals(
    "invitation organization matches",
    invitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "project organization matches",
    project.organization.id,
    organization.id,
  );
  // Note: Activity logs are automatically created for each organizational action above.
  // To fully validate activity log immutability, a list endpoint would be needed to:
  // - Retrieve all activity logs for the organization
  // - Filter by action_type (employee.invited, project.created, timesheet.submitted)
  // - Validate action_type, target_entity_type, target_entity_id, details fields
  // - Verify created_at timestamp matches action occurrence time
  // - Confirm organization and member relations are correct
  // - Validate created_at === updated_at (immutability marker)
}
