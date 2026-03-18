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
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsActivityLog";
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
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_activity_logs_viewing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member (primary user with org ownership)
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create new connection with token for member operations
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Get organization ID from member's organization memberships
  const orgId = memberAuth.organization_memberships[0].organization.id;
  const ownerRoleId =
    memberAuth.organization_memberships[0].organizationRole.id;
  // 4. Create another member (will be assigned org management role)
  const secondJoinConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(secondMemberAuth);
  const secondMemberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: secondMemberAuth.token.access },
  };
  // 5. Assign organization management role (use owner role for simplicity)
  const membership =
    await api.functional.hrms.member.organization_members.create(
      memberConnection,
      {
        body: {
          hrms_member_id: secondMemberAuth.id,
          hrms_organization_id: orgId,
          hrms_organization_role_id: ownerRoleId,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(membership);
  // 6. Create a project (generates activity log)
  // Generate expected values since API response type doesn't expose id/created_at
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const projectCreatedAt = new Date().toISOString();
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId: orgId,
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 7,
          }),
          color_code: RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 5,
          }),
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  // 7. Create a timesheet for second member (generates activity log)
  const now = new Date();
  const weekStartDate = new Date(now);
  weekStartDate.setHours(0, 0, 0, 0);
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Monday
  const timesheet = await api.functional.hrms.member.timesheets.create(
    secondMemberConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 8. Submit the timesheet (generates activity log)
  await api.functional.hrms.member.timesheets.submit(secondMemberConnection, {
    timesheetId: timesheet.id,
  });
  // 9. Query activity logs with various filters
  // 9.1. Query all activity logs (no filters)
  const allLogs = await api.functional.hrms.member.activity_logs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(allLogs);
  TestValidator.predicate("has activity logs", allLogs.data.length > 0);
  // 9.2. Filter by actionType (project.created)
  const projectCreatedLogs =
    await api.functional.hrms.member.activity_logs.index(memberConnection, {
      body: {
        actionType: "project.created",
        page: 1,
        limit: 20,
      } satisfies IHrmsActivityLog.IRequest,
    });
  typia.assert(projectCreatedLogs);
  const allProjectCreatedLogs = projectCreatedLogs.data;
  for (const log of allProjectCreatedLogs) {
    TestValidator.equals(
      "actionType matches",
      log.actionType,
      "project.created",
    );
  }
  TestValidator.predicate(
    "project log exists",
    allProjectCreatedLogs.some((l) => l.targetId === projectId),
  );
  // 9.3. Filter by targetEntityType (timesheet)
  const timesheetLogs = await api.functional.hrms.member.activity_logs.index(
    memberConnection,
    {
      body: {
        targetEntityType: "timesheet",
        page: 1,
        limit: 20,
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(timesheetLogs);
  for (const log of timesheetLogs.data) {
    TestValidator.equals(
      "targetEntityType matches",
      log.targetEntity,
      "timesheet",
    );
  }
  TestValidator.predicate(
    "timesheet log exists",
    timesheetLogs.data.some((l) => l.targetId === timesheet.id),
  );
  // 9.4. Filter by date range
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const dateFilteredLogs = await api.functional.hrms.member.activity_logs.index(
    memberConnection,
    {
      body: {
        createdAtFrom: projectCreatedAt,
        createdAtTo: futureDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(dateFilteredLogs);
  for (const log of dateFilteredLogs.data) {
    TestValidator.predicate(
      "createdAt matches range",
      new Date(log.createdAt) >= new Date(projectCreatedAt),
    );
  }
  // 9.5. Filter by performedByUserId (second member)
  const memberFilteredLogs =
    await api.functional.hrms.member.activity_logs.index(memberConnection, {
      body: {
        performedByUserId: secondMemberAuth.id,
        page: 1,
        limit: 20,
      } satisfies IHrmsActivityLog.IRequest,
    });
  typia.assert(memberFilteredLogs);
  for (const log of memberFilteredLogs.data) {
    TestValidator.equals(
      "performedByUserId matches",
      log.performedBy.id,
      secondMemberAuth.id,
    );
  }
  // 9.6. Test pagination with multiple pages
  const firstPage = await api.functional.hrms.member.activity_logs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(firstPage);
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.hrms.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IHrmsActivityLog.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.notEquals(
      "second page different data",
      firstPage.data[0]?.id,
      secondPage.data[0]?.id,
    );
  }
  // 9.7. Test sorting (ascending by created_at)
  const ascendingLogs = await api.functional.hrms.member.activity_logs.index(
    memberConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies IHrmsActivityLog.IRequest,
    },
  );
  typia.assert(ascendingLogs);
  if (ascendingLogs.data.length > 1) {
    for (let i = 1; i < ascendingLogs.data.length; i++) {
      const prevDate = new Date(ascendingLogs.data[i - 1].createdAt);
      const currDate = new Date(ascendingLogs.data[i].createdAt);
      TestValidator.predicate("ascending order correct", currDate >= prevDate);
    }
  }
  // 9.8. Verify performedBy user details are included
  for (const log of allLogs.data) {
    TestValidator.predicate(
      "performedBy has id",
      log.performedBy.id !== undefined,
    );
    TestValidator.predicate(
      "performedBy has email",
      log.performedBy.email !== undefined && log.performedBy.email !== null,
    );
    TestValidator.predicate(
      "performedBy has display_name",
      log.performedBy.display_name !== undefined &&
        log.performedBy.display_name !== null,
    );
  }
}
