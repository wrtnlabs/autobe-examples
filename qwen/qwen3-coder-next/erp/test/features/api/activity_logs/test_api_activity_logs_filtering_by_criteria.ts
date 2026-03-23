import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";

export async function test_api_activity_logs_filtering_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: `Admin User ${RandomGenerator.alphabets(4)}`,
    },
  });
  // 2. Invite two employees to generate activity logs
  const employeeInvitation1 =
    await api.functional.hrmTracker.member.invitations.create(adminConnection);
  typia.assert(employeeInvitation1);
  const employeeInvitation2 =
    await api.functional.hrmTracker.member.invitations.create(adminConnection);
  typia.assert(employeeInvitation2);
  // 3. Create two projects to generate activity logs
  const project1 = await api.functional.hrmTracker.member.projects.create(
    adminConnection,
    {
      body: {
        name: `Project ${RandomGenerator.name(2)}`,
        color: `#${RandomGenerator.alphabets(4)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(project1);
  const project2 = await api.functional.hrmTracker.member.projects.create(
    adminConnection,
    {
      body: {
        name: `Project ${RandomGenerator.name(2)}`,
        color: `#${RandomGenerator.alphabets(4)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(project2);
  // Wait a moment for activity logs to be generated
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Test filtering by action_type: employee_invited
  const actionTypeInvitedLogs =
    await api.functional.hrmTracker.activity_logs.index(adminConnection, {
      body: {
        action_type: "employee_invited",
        sort: "-created_at",
      },
    });
  typia.assert(actionTypeInvitedLogs);
  TestValidator.predicate(
    "employee_invited logs exist",
    actionTypeInvitedLogs.data.length > 0,
  );
  actionTypeInvitedLogs.data.forEach((log) => {
    TestValidator.equals(
      "action_type is employee_invited",
      log.action_type,
      "employee_invited",
    );
  });
  // 5. Test filtering by action_type: project_created
  const actionTypeProjectLogs =
    await api.functional.hrmTracker.activity_logs.index(adminConnection, {
      body: {
        action_type: "project_created",
        sort: "-created_at",
      },
    });
  typia.assert(actionTypeProjectLogs);
  TestValidator.predicate(
    "project_created logs exist",
    actionTypeProjectLogs.data.length > 0,
  );
  actionTypeProjectLogs.data.forEach((log) => {
    TestValidator.equals(
      "action_type is project_created",
      log.action_type,
      "project_created",
    );
  });
  // 6. Test filtering by target_entity_type
  const targetEmployeeLogs =
    await api.functional.hrmTracker.activity_logs.index(adminConnection, {
      body: {
        target_entity_type: "employee_invitation",
        sort: "-created_at",
      },
    });
  typia.assert(targetEmployeeLogs);
  targetEmployeeLogs.data.forEach((log) => {
    TestValidator.equals(
      "target_entity_type is employee_invitation",
      log.target_entity_type,
      "employee_invitation",
    );
  });
  const targetProjectLogs = await api.functional.hrmTracker.activity_logs.index(
    adminConnection,
    {
      body: {
        target_entity_type: "project",
        sort: "-created_at",
      },
    },
  );
  typia.assert(targetProjectLogs);
  targetProjectLogs.data.forEach((log) => {
    TestValidator.equals(
      "target_entity_type is project",
      log.target_entity_type,
      "project",
    );
  });
  // 7. Test filtering by actor_member_id
  const actorMemberLogs = await api.functional.hrmTracker.activity_logs.index(
    adminConnection,
    {
      body: {
        actor_member_id: adminMember.id,
        sort: "-created_at",
      },
    },
  );
  typia.assert(actorMemberLogs);
  TestValidator.predicate(
    "logs by actor_member_id exist",
    actorMemberLogs.data.length > 0,
  );
  actorMemberLogs.data.forEach((log) => {
    if (log.actorMember) {
      TestValidator.equals(
        "actor member ID matches",
        log.actorMember.id,
        adminMember.id,
      );
    }
  });
  // 8. Test filtering by target_entity_id
  const entityLogs = await api.functional.hrmTracker.activity_logs.index(
    adminConnection,
    {
      body: {
        target_entity_id: project1.id,
        sort: "-created_at",
      },
    },
  );
  typia.assert(entityLogs);
  entityLogs.data.forEach((log) => {
    TestValidator.equals(
      "target_entity_id matches",
      log.target_entity_id,
      project1.id,
    );
  });
  // 9. Test date range filtering
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeLogs = await api.functional.hrmTracker.activity_logs.index(
    adminConnection,
    {
      body: {
        created_at_gte: oneMinuteAgo,
        created_at_lte: tomorrow,
        sort: "-created_at",
      },
    },
  );
  typia.assert(dateRangeLogs);
  // 10. Test pagination validation
  TestValidator.equals(
    "pagination records matches data length",
    dateRangeLogs.pagination.records,
    dateRangeLogs.data.length,
  );
  TestValidator.predicate(
    "pagination current is valid",
    dateRangeLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    dateRangeLogs.pagination.limit >= 1 &&
      dateRangeLogs.pagination.limit <= 100,
  );
  // 11. Test combined filters
  const combinedLogs = await api.functional.hrmTracker.activity_logs.index(
    adminConnection,
    {
      body: {
        action_type: "project_created",
        actor_member_id: adminMember.id,
        created_at_gte: oneMinuteAgo,
        created_at_lte: tomorrow,
        sort: "-created_at",
      },
    },
  );
  typia.assert(combinedLogs);
  TestValidator.predicate(
    "combined filter logs exist",
    combinedLogs.data.length > 0,
  );
  combinedLogs.data.forEach((log) => {
    TestValidator.equals(
      "combined filter action_type",
      log.action_type,
      "project_created",
    );
    TestValidator.equals(
      "combined filter actor_member_id",
      log.actorMember?.id,
      adminMember.id,
    );
  });
}
