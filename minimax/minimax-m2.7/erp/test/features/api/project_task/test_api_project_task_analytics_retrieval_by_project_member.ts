import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_task_analytics_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials for admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 2. Setup admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin login
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 4. Generate credentials for member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 5. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 6. Member login
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 7. Admin creates a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 8. Admin assigns the member to the project as a member
  // The memberAuthorized.id is the member/user ID which should map to employee
  const projectMember =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: project.items[0].projectId },
        body: {
          employeeId: memberAuthorized.id,
          assignedRole: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 9. Member retrieves task analytics for the project
  const analytics = await api.functional.erpHrm.member.projects.tasks.analytics(
    memberConnection,
    {
      projectId: project.items[0].projectId,
    },
  );
  typia.assert(analytics);
  // 10. Validate analytics for empty project
  TestValidator.equals("totalTasks is 0", analytics.totalTasks, 0);
  TestValidator.equals(
    "statusBreakdown open is 0",
    analytics.statusBreakdown.open,
    0,
  );
  TestValidator.equals(
    "statusBreakdown inProgress is 0",
    analytics.statusBreakdown.inProgress,
    0,
  );
  TestValidator.equals(
    "statusBreakdown completed is 0",
    analytics.statusBreakdown.completed,
    0,
  );
  TestValidator.equals(
    "statusBreakdown closed is 0",
    analytics.statusBreakdown.closed,
    0,
  );
  TestValidator.equals(
    "priorityBreakdown low is 0",
    analytics.priorityBreakdown.low,
    0,
  );
  TestValidator.equals(
    "priorityBreakdown medium is 0",
    analytics.priorityBreakdown.medium,
    0,
  );
  TestValidator.equals(
    "priorityBreakdown high is 0",
    analytics.priorityBreakdown.high,
    0,
  );
  TestValidator.equals(
    "priorityBreakdown urgent is 0",
    analytics.priorityBreakdown.urgent,
    0,
  );
  TestValidator.equals("completionRate is 0", analytics.completionRate, 0);
  TestValidator.equals(
    "averageEstimatedHours is null",
    analytics.averageEstimatedHours,
    null,
  );
  TestValidator.equals("overdueTasks is 0", analytics.overdueTasks, 0);
  TestValidator.equals(
    "temporalTrend is empty array",
    analytics.temporalTrend.length,
    0,
  );
}
