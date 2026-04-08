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
import type { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetAction";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_timesheet_actions_index_filtering(connection: api.IConnection): Promise<void> {
    // 1. Create member account with organization
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
            org_name: RandomGenerator.name(),
            org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        },
    });
    typia.assert(memberAuth);
    // Update connection with token
    memberConnection.headers = {
        ...memberConnection.headers,
        Authorization: memberAuth.token.access,
    };
    // 2. Create a timesheet with random employee ID (API will validate)
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const randomEmployeeId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const timesheet = await api.functional.hrmPlatform.member.timesheets.create(memberConnection, {
        body: {
            start_date: monday.toISOString(),
            end_date: sunday.toISOString(),
            hrm_platform_employee_id: randomEmployeeId,
        },
    });
    typia.assert(timesheet);
    // 3. Query actions with no filter - get all actions
    const allActions = await api.functional.hrmPlatform.member.timesheets.actions.index(memberConnection, {
        timesheetId: timesheet.id,
        body: {
            page: 1,
            limit: 100,
        },
    });
    typia.assert(allActions);
    // 4. Query actions filtered by action type (submit)
    const submitActions = await api.functional.hrmPlatform.member.timesheets.actions.index(memberConnection, {
        timesheetId: timesheet.id,
        body: {
            action: "submit",
            page: 1,
            limit: 100,
        },
    });
    typia.assert(submitActions);
    // Validate that submit actions only contain submit type
    for (const action of submitActions.data) {
        TestValidator.equals("action type is submit", action.action, "submit");
    }
    // 5. Query actions filtered by actor_id
    if (allActions.data.length > 0) {
        const firstActorId = allActions.data[0].actor.id;
        const actorActions = await api.functional.hrmPlatform.member.timesheets.actions.index(memberConnection, {
            timesheetId: timesheet.id,
            body: {
                actor_id: firstActorId,
                page: 1,
                limit: 100,
            },
        });
        typia.assert(actorActions);
        // Validate all actions are by the specified actor
        for (const action of actorActions.data) {
            TestValidator.equals("action actor matches filter", action.actor.id, firstActorId);
        }
        // Validate actor_actions count matches filtered results
        TestValidator.equals("actor actions count", actorActions.data.length, allActions.data.filter((a) => a.actor.id === firstActorId).length);
    }
    // 6. Query actions filtered by date range
    if (allActions.data.length > 1) {
        // Sort actions by created_at
        const sortedActions = [...allActions.data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const startDate = sortedActions[Math.floor(sortedActions.length / 2)].created_at;
        const endDate = sortedActions[sortedActions.length - 1].created_at;
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const dateFilteredActions = await api.functional.hrmPlatform.member.timesheets.actions.index(memberConnection, {
            timesheetId: timesheet.id,
            body: {
                start_date: startDate,
                end_date: endDate,
                page: 1,
                limit: 100,
            },
        });
        typia.assert(dateFilteredActions);
        // Validate all actions are within the date range
        for (const action of dateFilteredActions.data) {
            const actionDate = new Date(action.created_at);
            TestValidator.predicate("action created_at >= start_date", actionDate >= startDateObj);
            TestValidator.predicate("action created_at <= end_date", actionDate <= endDateObj);
        }
        // Validate date filtered actions count matches filtered results
        const expectedCount = allActions.data.filter((a) => {
            const actionDate = new Date(a.created_at);
            return actionDate >= startDateObj && actionDate <= endDateObj;
        }).length;
        TestValidator.equals("date filtered actions count", dateFilteredActions.data.length, expectedCount);
    }
    // 7. Query actions with non-existent filter (empty results)
    const emptyFilterActions = await api.functional.hrmPlatform.member.timesheets.actions.index(memberConnection, {
        timesheetId: timesheet.id,
        body: {
            action: "approve",
            page: 1,
            limit: 100,
        },
    });
    typia.assert(emptyFilterActions);
    // Validate empty results
    TestValidator.equals("empty filter returns empty data", emptyFilterActions.data.length, 0);
    TestValidator.equals("empty filter pagination records", emptyFilterActions.pagination.records, 0);
    TestValidator.equals("empty filter pagination pages", emptyFilterActions.pagination.pages, 0);
}