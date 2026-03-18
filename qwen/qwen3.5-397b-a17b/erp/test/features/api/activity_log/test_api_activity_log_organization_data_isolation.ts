import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test activity log organization data isolation.
 *
 * This test verifies that activity logs are strictly isolated by organization context:
 * 1. Create two separate organizations with different members
 * 2. Each organization performs distinct activities (employee invitations, project creations)
 * 3. Member from Organization A can only see activity logs from Organization A
 * 4. Member from Organization B can only see activity logs from Organization B
 * 5. Activity logs include correct member information showing who performed each action
 *
 * This validates the multi-tenancy data isolation requirement where organization_id
 * filtering is automatically applied from the user's session context.
 */
export async function test_api_activity_log_organization_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A and Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  const orgA = await generate_random_hrm_platform_member_organizations_create(
    memberAConnection,
    {
      body: {
        name: `OrgA-${RandomGenerator.alphabets(8)}`,
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgA);
  // 2. Create Member B and Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  const orgB = await generate_random_hrm_platform_member_organizations_create(
    memberBConnection,
    {
      body: {
        name: `OrgB-${RandomGenerator.alphabets(8)}`,
        currency: "EUR",
        timezone: "America/New_York",
        fiscal_start_month: 4,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgB);
  // 3. Generate activity in Organization A - Invite employee
  const employeeInviteA =
    await api.functional.hrmPlatform.member.employees.invite(
      memberAConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformEmployee.IInvite,
      },
    );
  typia.assert(employeeInviteA);
  // 4. Generate activity in Organization A - Create project
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberAConnection,
    {
      body: {
        name: `ProjectA-${RandomGenerator.alphabets(8)}`,
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectA);
  // 5. Generate activity in Organization B - Invite employee
  const employeeInviteB =
    await api.functional.hrmPlatform.member.employees.invite(
      memberBConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformEmployee.IInvite,
      },
    );
  typia.assert(employeeInviteB);
  // 6. Generate activity in Organization B - Create project
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberBConnection,
    {
      body: {
        name: `ProjectB-${RandomGenerator.alphabets(8)}`,
        color_code: "#33FF57",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectB);
  // 7. Retrieve activity logs from Organization A's perspective
  const activityLogsA =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(activityLogsA);
  // 8. Retrieve activity logs from Organization B's perspective
  const activityLogsB =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberBConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(activityLogsB);
  // 9. Validate organization isolation - Member A should only see Org A activities
  TestValidator.predicate(
    "Member A has activity logs",
    () => activityLogsA.data.length > 0,
  );
  TestValidator.predicate(
    "Member B has activity logs",
    () => activityLogsB.data.length > 0,
  );
  // Verify all activity logs from Member A belong to Organization A
  for (const log of activityLogsA.data) {
    TestValidator.equals(
      "Activity log member belongs to Org A",
      log.member.id,
      memberAAuth.member.id,
    );
  }
  // Verify all activity logs from Member B belong to Organization B
  for (const log of activityLogsB.data) {
    TestValidator.equals(
      "Activity log member belongs to Org B",
      log.member.id,
      memberBAuth.member.id,
    );
  }
  // 10. Validate that activity logs are completely isolated between organizations
  const orgALogMemberIds = activityLogsA.data.map((log) => log.member.id);
  const orgBLogMemberIds = activityLogsB.data.map((log) => log.member.id);
  TestValidator.predicate(
    "No overlap in activity log members between organizations",
    () => !orgALogMemberIds.some((id) => orgBLogMemberIds.includes(id)),
  );
  // 11. Validate activity log structure and member information
  if (activityLogsA.data.length > 0) {
    const firstLogA = activityLogsA.data[0];
    TestValidator.predicate(
      "Activity log has valid action type",
      () => firstLogA.action_type.length > 0,
    );
    TestValidator.predicate(
      "Activity log has valid target entity type",
      () => firstLogA.target_entity_type.length > 0,
    );
    TestValidator.predicate(
      "Activity log has valid target entity ID",
      () => firstLogA.target_entity_id.length > 0,
    );
    TestValidator.equals(
      "Activity log member ID matches authenticated member",
      firstLogA.member.id,
      memberAAuth.member.id,
    );
    TestValidator.equals(
      "Activity log member email matches authenticated member",
      firstLogA.member.email,
      memberAAuth.member.email,
    );
  }
  if (activityLogsB.data.length > 0) {
    const firstLogB = activityLogsB.data[0];
    TestValidator.predicate(
      "Activity log has valid action type",
      () => firstLogB.action_type.length > 0,
    );
    TestValidator.predicate(
      "Activity log has valid target entity type",
      () => firstLogB.target_entity_type.length > 0,
    );
    TestValidator.predicate(
      "Activity log has valid target entity ID",
      () => firstLogB.target_entity_id.length > 0,
    );
    TestValidator.equals(
      "Activity log member ID matches authenticated member",
      firstLogB.member.id,
      memberBAuth.member.id,
    );
    TestValidator.equals(
      "Activity log member email matches authenticated member",
      firstLogB.member.email,
      memberBAuth.member.email,
    );
  }
}
