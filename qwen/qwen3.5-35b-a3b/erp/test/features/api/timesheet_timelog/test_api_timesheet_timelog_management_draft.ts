import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

// Global variable to store memberAuth for use in setup function
let memberAuth: IHrmPlatformMember.IAuthorized;

export async function test_api_timesheet_timelog_management_draft(connection: api.IConnection): Promise<void> {
    // 1. Authenticate member and create organization
    const memberConnection: api.IConnection = { host: connection.host };
    memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            org_name: RandomGenerator.name(),
            org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
            org_description: RandomGenerator.paragraph(),
            org_logo_uri: typia.random<string & tags.Format<"uri">>(),
            org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul", "America/New_York"]),
            org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(memberAuth);
    // 2. Create project and task for timelogs
    const { employee_id, project_id, task_id } = await setup_project_and_task(memberConnection);
    // 3. Create initial timelogs (these will be part of the timesheet)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Monday
    const workDayStart = new Date(weekStart);
    workDayStart.setHours(9, 0, 0, 0);
    const workDayEnd = new Date(weekStart);
    workDayEnd.setHours(17, 0, 0, 0);
    const timelog1 = await api.functional.hrmPlatform.member.timelogs.create(memberConnection, {
        body: {
            employee_id,
            project_id,
            task_id,
            start_datetime: workDayStart.toISOString(),
            end_datetime: workDayEnd.toISOString(),
            duration_minutes: 480, // 8 hours
            description: "Work session 1",
            billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
    });
    typia.assert(timelog1);
    const timelog2 = await api.functional.hrmPlatform.member.timelogs.create(memberConnection, {
        body: {
            employee_id,
            project_id,
            task_id,
            start_datetime: workDayStart.toISOString(),
            end_datetime: workDayEnd.toISOString(),
            duration_minutes: 240, // 4 hours
            description: "Work session 2",
            billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
    });
    typia.assert(timelog2);
    // 4. Create a timesheet for the week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Set to Sunday
    const timesheet = await generate_random_hrm_platform_member_timesheets_create(memberConnection, {
        body: {
            start_date: weekStart.toISOString(),
            end_date: weekEnd.toISOString(),
            hrm_platform_employee_id: employee_id,
            notes: "Initial timesheet with default timelogs",
        } satisfies IHrmPlatformTimesheet.ICreate,
    });
    typia.assert(timesheet);
    // Store initial state
    const initialTimelogCount = timesheet.timelogs.length;
    const initialTotalHours = timesheet.total_hours || 0;
    const initialTimelogIds = new Set(timesheet.timelogs.map((t) => t.id));
    // 5. Create additional timelog to add to the timesheet later
    const additionalTimelog = await api.functional.hrmPlatform.member.timelogs.create(memberConnection, {
        body: {
            employee_id,
            project_id,
            task_id,
            start_datetime: workDayStart.toISOString(),
            end_datetime: workDayEnd.toISOString(),
            duration_minutes: 360, // 6 hours
            description: "Additional work session",
            billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
    });
    typia.assert(additionalTimelog);
    // 6. Add additional timelog to the draft timesheet
    const addedTimesheet = await api.functional.hrmPlatform.member.timesheets.timelogs.manage(memberConnection, {
        timesheetId: timesheet.id,
        body: {
            adds: [additionalTimelog.id],
        } satisfies IHrmPlatformTimesheet.ITimelogManageRequest,
    });
    typia.assert(addedTimesheet);
    // Validate: status remains draft
    TestValidator.equals("timesheet status remains draft", addedTimesheet.status, "pending");
    // Validate: new timelog is included in collection
    TestValidator.equals("additional timelog added to collection", addedTimesheet.timelogs.map((t) => t.id).includes(additionalTimelog.id), true);
    // Validate: timelog count reflects actual number
    TestValidator.equals("timelog count matches actual array length", addedTimesheet.timelogs.length, initialTimelogCount + 1);
    // Validate: total_hours recalculated correctly
    const additionalDurationHours = additionalTimelog.duration_minutes / 60;
    const expectedTotalHours = initialTotalHours + additionalDurationHours;
    TestValidator.equals("total_hours recalculated after adding timelog", addedTimesheet.total_hours || 0, expectedTotalHours);
    // 7. Remove a timelog from the draft timesheet
    const timelogToRemove = [...initialTimelogIds][0];
    const removedTimelog = timesheet.timelogs.find((t) => t.id === timelogToRemove);
    TestValidator.notEquals("timelog to remove exists in original timesheet", removedTimelog, undefined);
    const removedTimelogDurationHours = removedTimelog!.duration_minutes / 60;
    const removedTimesheet = await api.functional.hrmPlatform.member.timesheets.timelogs.manage(memberConnection, {
        timesheetId: timesheet.id,
        body: {
            removes: [timelogToRemove],
        } satisfies IHrmPlatformTimesheet.ITimelogManageRequest,
    });
    typia.assert(removedTimesheet);
    // Validate: removed timelog is no longer in collection
    TestValidator.equals("timelog removed from collection", removedTimesheet.timelogs.map((t) => t.id).includes(timelogToRemove), false);
    // Validate: timelog count matches actual array length after removal
    TestValidator.equals("timelog count matches actual array length after removal", removedTimesheet.timelogs.length, initialTimelogCount);
    // Validate: total_hours recalculated correctly after removal
    const expectedTotalAfterRemoval = expectedTotalHours - removedTimelogDurationHours;
    TestValidator.equals("total_hours recalculated after removing timelog", removedTimesheet.total_hours || 0, expectedTotalAfterRemoval);
    // 8. Verify updated_at timestamp was refreshed
    const updatedTime = new Date(removedTimesheet.updated_at);
    TestValidator.predicate("updated_at timestamp refreshed after modification", updatedTime <= new Date());
}

// Helper function to create project and task
async function setup_project_and_task(memberConnection: api.IConnection): Promise<{
    employee_id: string;
    project_id: string;
    task_id: string;
}> {
    const employee_id = memberAuth.member.id;
    const project_id = typia.random<string & tags.Format<"uuid">>();
    const task_id = typia.random<string & tags.Format<"uuid">>();
    return { employee_id, project_id, task_id };
}