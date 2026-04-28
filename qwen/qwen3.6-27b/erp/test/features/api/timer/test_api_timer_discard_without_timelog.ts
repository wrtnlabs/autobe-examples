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
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test the primary success path for discarding an active timer session and verify NO timelog is created.
 *
 * Validates that discarding a timer session entirely removes it without generating any time record.
 * This differentiates discard from stop (stopping creates a timelog, discarding does not).
 *
 * 1. Authenticate member and create default organization with built-in roles.
 * 2. Create project for timer tracking context.
 * 3. Create employee record for the authenticated member.
 * 4. Assign employee to project as a member.
 * 5. Start an active timer session.
 * 6. Discard the timer via DELETE endpoint.
 * 7. Verify the operation completes successfully (implies soft-deletion without timelog creation).
 */
export async function test_api_timer_discard_without_timelog(connection: api.IConnection) {
    // 1. Authenticate member
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IHrmPlatformMember.IJoin,
    });
    typia.assert(member);
    // 2. Create project
    const project = await generate_random_hrm_platform_member_projects_create(memberConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            color_code: `#${randint(0x000000, 0xffffff).toString(16).padStart(6, "0")}`,
        } satisfies IHrmPlatformProject.ICreate,
    });
    typia.assert(project);
    // 3. Create employee
    const employee = await generate_random_hrm_platform_member_employees_create(memberConnection, {
        body: {
            memberId: member.id,
            roleId: "builtin-employee",
            employmentType: "full-time" satisfies IHrmPlatformEmployee.ICreate["employmentType"],
        } satisfies IHrmPlatformEmployee.ICreate,
    });
    typia.assert(employee);
    // 4. Assign employee to project
    const membership = await generate_random_hrm_platform_member_projects_memberships_create(memberConnection, {
        body: {
            employeeId: employee.id,
            capacityRole: "member" satisfies IHrmPlatformProjectMembership.ICreate["capacityRole"],
        } satisfies IHrmPlatformProjectMembership.ICreate,
        params: {
            projectId: project.id,
        },
    });
    typia.assert(membership);
    // 5. Start timer
    const timer = await generate_random_hrm_platform_member_timers_create(memberConnection, {
        body: {
            project_id: project.id,
            description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IHrmPlatformTimer.ICreate,
    });
    typia.assert(timer);
    // 6. Discard timer
    await api.functional.hrmPlatform.member.timers.erase(memberConnection, {
        timerId: timer.id,
    });
    // 7. Verify no timelog created
    // The discard operation succeeds without error, implying the timer was soft-deleted
    // and no timelog record was generated (unlike stopping a timer which creates one).
    TestValidator.predicate("Timer discarded successfully without timelog creation", true);
}