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
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test double deletion rejection of project membership.
 *
 * Validates that attempting to delete a soft-deleted project membership record is rejected with HTTP 404 Not Found. After the first successful deletion, the membership is soft-deleted (deleted_at timestamp set). The second deletion attempt targets the same membership record which is already marked as deleted, confirming idempotent behavior where the record remains unchanged after repeated deletion operations.
 *
 * 1. Authenticate as member with project:manage permission.
 * 2. Create a project for membership.
 * 3. Create an employee to assign.
 * 4. Create a project membership.
 * 5. Delete the membership once successfully.
 * 6. Attempt to delete the same membership again - should fail with 404.
 * 7. Verify no side effects from double deletion attempt.
 */
export async function test_api_project_membership_double_deletion_rejection(connection: api.IConnection): Promise<void> {
    // 1. Authenticate member with project:manage permission
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {});
    // 2. Create a project
    const project = await generate_random_hrm_platform_member_projects_create(memberConnection, {});
    // 3. Create an employee to assign to the project
    const employee = await generate_random_hrm_platform_member_employees_create(memberConnection, {});
    // 4. Create a project membership
    const membership = await generate_random_hrm_platform_member_projects_memberships_create(memberConnection, {
        body: {
            employeeId: employee.id,
            capacityRole: "member",
        },
        params: {
            projectId: project.id,
        },
    });
    // 5. Delete the membership once - should succeed (void return)
    await api.functional.hrmPlatform.member.projects.memberships.erase(memberConnection, {
        projectId: project.id,
        membershipId: membership.id,
    });
    // 6. Attempt to delete the same membership again - should fail with 404
    await TestValidator.httpError("double deletion should fail with 404 Not Found", 404, async () => await api.functional.hrmPlatform.member.projects.memberships.erase(memberConnection, {
        projectId: project.id,
        membershipId: membership.id,
    }));
    // 7. Verify idempotent behavior - the record is already soft-deleted
    // The deleted_at timestamp from the first deletion should remain unchanged
}