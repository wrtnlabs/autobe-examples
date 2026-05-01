import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_personal_with_all_sections_populated(
    connection: api.IConnection,
): Promise<void> {
    // 1. Authenticate as member
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {});
    typia.assert(member);

    // 2. Create a project
    const project = await generate_random_erp_hrm_member_projects_create(
        memberConnection,
        {},
    );
    typia.assert(project);

    // 3. Compute date boundaries
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const mondayStr = monday.toISOString().substring(0, 10);
    const sundayStr = sunday.toISOString().substring(0, 10);

    // Earlier date in the current week (at most 2 days before today, not before Monday)
    const earlierDate = new Date(now);
    earlierDate.setDate(now.getDate() - Math.min(daysFromMonday, 2));
    const earlierDateStr = earlierDate.toISOString().substring(0, 10);

    // 4. Create timelogs for today
    const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
        memberConnection,
        {
            body: {
                project_id: project.id,
                date: todayStr,
                duration_minutes: 120,
            },
        },
    );
    typia.assert(timelog1);

    const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
        memberConnection,
        {
            body: {
                project_id: project.id,
                date: todayStr,
                duration_minutes: 90,
            },
        },
    );
    typia.assert(timelog2);

    // 5. Create a timelog for earlier this week
    const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
        memberConnection,
        {
            body: {
                project_id: project.id,
                date: earlierDateStr,
                duration_minutes: 60,
            },
        },
    );
    typia.assert(timelog3);

    const allTimelogs = [timelog1, timelog2, timelog3];

    // 6. Create tasks with different statuses and priorities
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + 30);
    const openTask = await generate_random_erp_hrm_member_projects_tasks_create(
        memberConnection,
        {
            body: {
                status: "open",
                priority: "medium",
                due_date: futureDate.toISOString(),
            },
            params: { projectId: project.id },
        },
    );
    typia.assert(openTask);

    const urgentFuture = new Date(now.getTime() + 86400000);
    const urgentTask =
        await generate_random_erp_hrm_member_projects_tasks_create(
            memberConnection,
            {
                body: {
                    status: "in-progress",
                    priority: "urgent",
                    due_date: urgentFuture.toISOString(),
                },
                params: { projectId: project.id },
            },
        );
    typia.assert(urgentTask);

    // 7. Start a live timer
    const timer = await generate_random_erp_hrm_member_timers_create(
        memberConnection,
        {
            body: {
                erp_hrm_project_id: project.id,
            },
        },
    );
    typia.assert(timer);

    // 8. Create a draft timesheet for the current week
    const timesheet = await generate_random_erp_hrm_member_timesheets_create(
        memberConnection,
        {
            body: {
                week_start_date: monday.toISOString(),
            },
        },
    );
    typia.assert(timesheet);

    // 9. Fetch the personal dashboard
    const dashboard =
        await api.functional.erpHrm.member.dashboard.personal.at(
            memberConnection,
        );
    typia.assert(dashboard);

    // 10. Compute expected aggregates from created timelogs
    const inWeekRange = (dateStr: string): boolean => {
        const d = dateStr.substring(0, 10);
        return d >= mondayStr && d <= sundayStr;
    };

    const expectedTodayMinutes = allTimelogs
        .filter((t) => t.date.substring(0, 10) === todayStr)
        .reduce((sum, t) => sum + t.duration_minutes, 0);

    const expectedWeekMinutes = allTimelogs
        .filter((t) => inWeekRange(t.date))
        .reduce((sum, t) => sum + t.duration_minutes, 0);

    // 11. Validate hours today
    TestValidator.equals(
        "hours_today_minutes matches today's timelog sum",
        dashboard.hours_today_minutes,
        expectedTodayMinutes,
    );
    TestValidator.equals(
        "hours_today_decimal_hours equals minutes / 60",
        dashboard.hours_today_decimal_hours,
        expectedTodayMinutes / 60,
    );

    // 12. Validate hours this week
    TestValidator.equals(
        "hours_this_week_minutes matches this week's timelog sum",
        dashboard.hours_this_week_minutes,
        expectedWeekMinutes,
    );
    TestValidator.equals(
        "hours_this_week_decimal_hours equals minutes / 60",
        dashboard.hours_this_week_decimal_hours,
        expectedWeekMinutes / 60,
    );

    // 13. Validate active timer
    TestValidator.predicate(
        "active_timer is not null",
        dashboard.active_timer !== null,
    );
    if (dashboard.active_timer !== null) {
        TestValidator.equals(
            "active_timer project id matches created project",
            dashboard.active_timer.project.id,
            project.id,
        );
        TestValidator.predicate(
            "active_timer has valid start_timestamp",
            dashboard.active_timer.start_timestamp.length > 0,
        );
        TestValidator.predicate(
            "active_timer has valid id",
            dashboard.active_timer.id.length > 0,
        );
    }

    // 14. Validate recent timelogs
    TestValidator.predicate(
        "recent_timelogs has at least one entry",
        dashboard.recent_timelogs.length > 0,
    );
    TestValidator.predicate(
        "recent_timelogs has at most 5 entries",
        dashboard.recent_timelogs.length <= 5,
    );
    TestValidator.predicate(
        "recent_timelogs entries have required fields",
        dashboard.recent_timelogs.every(
            (tl) =>
                tl.id.length > 0 &&
                tl.date.length > 0 &&
                tl.duration_minutes > 0 &&
                tl.project.id.length > 0,
        ),
    );

    // 15. Validate pending timesheet
    TestValidator.predicate(
        "pending_timesheet is not null",
        dashboard.pending_timesheet !== null,
    );
    if (dashboard.pending_timesheet !== null) {
        TestValidator.equals(
            "pending_timesheet status is draft",
            dashboard.pending_timesheet.status,
            "draft",
        );
        TestValidator.predicate(
            "pending_timesheet has week boundaries",
            dashboard.pending_timesheet.week_start_date.length > 0 &&
                dashboard.pending_timesheet.week_end_date.length > 0,
        );
        TestValidator.predicate(
            "pending_timesheet has valid id",
            dashboard.pending_timesheet.id.length > 0,
        );
    }

    // 16. Validate assigned_tasks is an array
    TestValidator.predicate(
        "assigned_tasks is an array",
        Array.isArray(dashboard.assigned_tasks),
    );
}