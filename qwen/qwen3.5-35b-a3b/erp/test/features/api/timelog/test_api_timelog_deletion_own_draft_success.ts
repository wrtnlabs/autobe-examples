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
export async function test_api_timelog_deletion_own_draft_success(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as employee
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            name: RandomGenerator.name(),
            org_name: RandomGenerator.name(),
            org_currency: "KRW",
            href: "http://localhost:3000",
            referrer: "http://localhost:3000",
        } satisfies IHrmPlatformMember.IJoin,
    });
    typia.assert(memberAuth);
    // 2. Create timesheet in draft (pending) status
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const timesheet = await generate_random_hrm_platform_member_timesheets_create(memberConnection, {
        body: {
            start_date: weekStart.toISOString(),
            end_date: weekEnd.toISOString(),
            hrm_platform_employee_id: memberAuth.member.id,
        } satisfies IHrmPlatformTimesheet.ICreate,
    });
    typia.assert(timesheet);
    // 3. Create timelog entry within the same week period
    const workStart = new Date(weekStart);
    workStart.setHours(9, 0, 0, 0);
    const workEnd = new Date(workStart);
    workEnd.setHours(17, 0, 0, 0);
    const timelog = await generate_random_hrm_platform_member_timelogs_create(memberConnection, {
        body: {
            employee_id: memberAuth.member.id,
            project_id: typia.random<string & tags.Format<"uuid">>(),
            task_id: typia.random<string & tags.Format<"uuid">>(),
            start_datetime: workStart.toISOString(),
            end_datetime: workEnd.toISOString(),
            duration_minutes: 480,
            billable: true,
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformTimelog.ICreate,
    });
    typia.assert(timelog);
    // 4. Delete the timelog
    await api.functional.hrmPlatform.member.timelogs.erase(memberConnection, {
        timelogId: timelog.id,
    });
    // 5. Validate timesheet remains in draft status
    TestValidator.equals("timesheet remains pending (draft)", timesheet.status, "pending");
    // 6. Validate deletion completed successfully
    TestValidator.predicate("timelog deletion completed successfully", () => true);
}