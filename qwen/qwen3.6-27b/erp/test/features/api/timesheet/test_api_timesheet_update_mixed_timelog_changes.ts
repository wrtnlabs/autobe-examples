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
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test mixed timelog changes update on a draft timesheet.
 *
 * Validates the complex update logic where a member updates their draft timesheet by providing a mix of existing and new timelog IDs. The system should correctly remove timelogs not included in the new list and add the new ones, ensuring all belong to the same employee and fall within the timesheet's week period. The total_hours must be correctly updated based on the final set of timelogs.
 *
 * 1. Authenticate the member user to obtain access tokens.
 * 2. Create a custom role for the employee to be assigned to.
 * 3. Create an employee record linking the member to the organization.
 * 4. Create a project for timelog associations.
 * 5. Assign the employee as a project member.
 * 6. Create multiple timelogs within a specific week.
 * 7. Create a draft timesheet for the week.
 * 8. Update the timesheet with a mixed list of timelog IDs (removing some existing ones, adding new ones).
 * 9. Validate the timesheet correctly reflects the mixed timelog changes.
 */
export async function test_api_timesheet_update_mixed_timelog_changes(connection: api.IConnection) {
    // Step 1: Authenticate member
    const memberConnection: api.IConnection = { host: connection.host };
    const authorized: IHrmPlatformMember.IAuthorized = await authorize_member_join(memberConnection, {
        body: {},
    });
    const memberId: string = authorized.id;
    // Step 2: Create a role for the employee
    const role: IHrmPlatformRole = await generate_random_hrm_platform_member_roles_create(memberConnection, {
        body: { name: "Staff", description: "Staff role", permissionKeys: ["project:view", "time:manage"] },
    });
    typia.assert(role);
    // Step 3: Create employee with proper camelCase
    const employee: IHrmPlatformEmployee = await generate_random_hrm_platform_member_employees_create(memberConnection, {
        body: {
            memberId: memberId,
            roleId: role.id,
            employmentType: "full-time",
        },
    });
    typia.assert(employee);
    // Step 4: Create a project
    const project: IHrmPlatformProject = await generate_random_hrm_platform_member_projects_create(memberConnection, {
        body: {},
    });
    typia.assert(project);
    // Step 5: Assign the employee to project with proper employeeId and capacityRole
    const membership: IHrmPlatformProjectMembership = await generate_random_hrm_platform_member_projects_memberships_create(memberConnection, {
        body: { employeeId: employee.id, capacityRole: "member" },
        params: { projectId: project.id },
    });
    typia.assert(membership);
    // Step 6: Create multiple timelogs within a specific week
    const weekStart: Date = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday of current week
    const weekStartISO: string = weekStart.toISOString();
    const timelog1: IHrmPlatformTimelog = await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
        body: {
            projectId: project.id,
            date: weekStartISO,
            durationMinutes: 120,
            workDescription: "Timelog 1",
            billable: true,
        },
    });
    typia.assert(timelog1);
    const timelog2: IHrmPlatformTimelog = await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
        body: {
            projectId: project.id,
            date: weekStartISO,
            durationMinutes: 60,
            workDescription: "Timelog 2",
            billable: false,
        },
    });
    typia.assert(timelog2);
    const timelog3: IHrmPlatformTimelog = await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
        body: {
            projectId: project.id,
            date: weekStartISO,
            durationMinutes: 90,
            workDescription: "Timelog 3",
            billable: true,
        },
    });
    typia.assert(timelog3);
    const timelog4: IHrmPlatformTimelog = await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
        body: {
            projectId: project.id,
            date: weekStartISO,
            durationMinutes: 45,
            workDescription: "Timelog 4",
            billable: true,
        },
    });
    typia.assert(timelog4);
    // Step 7: Create a draft timesheet for the week
    const timesheet: IHrmPlatformTimesheet = await generate_random_hrm_platform_member_timesheets_create(memberConnection, {
        body: {
            week_start_date: weekStartISO,
        },
    });
    typia.assert(timesheet);
    TestValidator.equals("timesheet status should be draft", timesheet.status, "draft");
    // Step 8: Update the timesheet with a MIX of timelog IDs
    // Include timelog1 (already in timesheet, keep it)
    // Include timelog2 (already in timesheet, keep it)
    // Exclude timelog3 (remove from timesheet)
    // Include timelog4 (add to timesheet)
    const updateBody: IHrmPlatformTimesheet.IUpdate = {
        timelogIds: [timelog1.id, timelog2.id, timelog4.id],
    };
    const updatedTimesheet: IHrmPlatformTimesheet = await api.functional.hrmPlatform.member.timesheets.update(memberConnection, {
        timesheetId: timesheet.id,
        body: updateBody,
    });
    typia.assert(updatedTimesheet);
    // Step 9: Validate the mixed timelog changes
    // timelog1 should be included (was in original, kept in update)
    const hasTimelog1: boolean = updatedTimesheet.timelogs.some(log => log.id === timelog1.id);
    TestValidator.equals("timelog1 should be included", hasTimelog1, true);
    // timelog2 should be included (was in original, kept in update)
    const hasTimelog2: boolean = updatedTimesheet.timelogs.some(log => log.id === timelog2.id);
    TestValidator.equals("timelog2 should be included", hasTimelog2, true);
    // timelog3 should NOT be included (excluded from the update)
    const hasTimelog3: boolean = updatedTimesheet.timelogs.some(log => log.id === timelog3.id);
    TestValidator.equals("timelog3 should be removed", hasTimelog3, false);
    // timelog4 should be included (added in the update)
    const hasTimelog4: boolean = updatedTimesheet.timelogs.some(log => log.id === timelog4.id);
    TestValidator.equals("timelog4 should be included", hasTimelog4, true);
    // Validate total_hours is correctly calculated
    // Expected: timelog1 (120 min) + timelog2 (60 min) + timelog4 (45 min) = 225 minutes = 3.75 hours
    const expectedTotalHours: number = (timelog1.duration_minutes + timelog2.duration_minutes + timelog4.duration_minutes) / 60.0;
    TestValidator.equals("total_hours should match sum of included timelogs", updatedTimesheet.total_hours, expectedTotalHours);
}