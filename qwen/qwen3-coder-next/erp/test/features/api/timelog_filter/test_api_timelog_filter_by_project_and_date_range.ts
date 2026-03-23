import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_timelogs_create } from "../../../generate/generate_random_hrm_tracker_member_timelogs_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_timelog } from "../../../prepare/prepare_random_hrm_tracker_timelog";

export async function test_api_timelog_filter_by_project_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create project and assign member
  const project = await generate_random_hrm_tracker_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project-${RandomGenerator.alphabets(6)}`,
        color: RandomGenerator.pick(["#FF5733", "#33FF57", "#3357FF"]),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  const projectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_tracker_employee_id: member.id,
          role: "member",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 3. Create timelogs with various dates and billable statuses
  const today = new Date();
  const dates = [
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
  ];
  const timelogs = await ArrayUtil.asyncRepeat(dates.length, async (i) => {
    const isBillable = i % 2 === 0;
    return await generate_random_hrm_tracker_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: dates[i].toISOString().split("T")[0],
          duration_in_minutes: 60 * (i + 1),
          project_id: project.id,
          description: `Task on ${dates[i].toISOString().split("T")[0]}`,
          billable: isBillable,
        } satisfies IHrmTrackerTimelog.ICreate,
      },
    );
  });
  typia.assert(timelogs);
  // 4. Filter timelogs by project and date range
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 4,
  );
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 2,
  );
  const filtered = await api.functional.hrmTracker.member.timelogs.index(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      } satisfies IHrmTrackerTimelog.IRequest,
    },
  );
  typia.assert(filtered);
  // 5. Validate filtering results
  const filteredTimelogs = timelogs.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= startDate && tDate <= endDate;
  });
  TestValidator.equals(
    "filtered count",
    filtered.data.length,
    filteredTimelogs.length,
  );
  // Validate date range
  filtered.data.forEach((timelog) => {
    const timelogDate = new Date(timelog.date);
    TestValidator.predicate(
      "date within range",
      timelogDate >= startDate && timelogDate <= endDate,
    );
    TestValidator.equals("project matches", timelog.project?.id, project.id);
  });
  // Validate computed hour fields
  const totalMinutes = filteredTimelogs.reduce(
    (sum, t) => sum + t.duration_in_minutes,
    0,
  );
  const billableMinutes = filteredTimelogs
    .filter((t) => t.billable)
    .reduce((sum, t) => sum + t.duration_in_minutes, 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;
  const expectedHours = totalMinutes / 60;
  const expectedBillableHours = billableMinutes / 60;
  const expectedNonBillableHours = nonBillableMinutes / 60;
  const actualHours = filtered.data.reduce((sum, t) => sum + (t.hours ?? 0), 0);
  const actualBillableHours = filtered.data.reduce(
    (sum, t) => sum + (t.billable_hours ?? 0),
    0,
  );
  const actualNonBillableHours = filtered.data.reduce(
    (sum, t) => sum + (t.non_billable_hours ?? 0),
    0,
  );
  TestValidator.equals("total hours matches", actualHours, expectedHours);
  TestValidator.equals(
    "billable hours matches",
    actualBillableHours,
    expectedBillableHours,
  );
  TestValidator.equals(
    "non-billable hours matches",
    actualNonBillableHours,
    expectedNonBillableHours,
  );
}
