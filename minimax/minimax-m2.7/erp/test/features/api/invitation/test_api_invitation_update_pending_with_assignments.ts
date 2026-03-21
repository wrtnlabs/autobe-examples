import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_invitation_update_pending_with_assignments(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as admin to create role and department
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {});
    // 2. Create a role with employee:manage permission
    const role = await generate_random_erp_hrm_admin_roles_create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            permissions: ["employee:manage"],
        },
    });
    typia.assert(role);
    // 3. Create a department
    const department = await generate_random_erp_hrm_admin_departments_create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
        },
    });
    typia.assert(department);
    // 4. Authenticate as member with employee:manage permission
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {});
    // 5. Create a pending invitation
    const invitation = await generate_random_erp_hrm_member_invitations_create(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>() as string & tags.Format<"email">,
        },
    });
    typia.assert(invitation);
    // 6. Call PUT /erpHrm/member/invitations/{invitationId} to update
    const extendedExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newPosition = RandomGenerator.paragraph({ sentences: 1 });
    const newNote = RandomGenerator.paragraph({ sentences: 2 });
    const updatedInvitation = await api.functional.erpHrm.member.invitations.update(memberConnection, {
        invitationId: invitation.id,
        body: {
            erpHrmRoleId: role.id,
            erpHrmDepartmentId: department.id,
            position: newPosition,
            note: newNote,
            expiresAt: extendedExpiresAt,
        },
    });
    typia.assert(updatedInvitation);
    // 7. Validate business logic
    TestValidator.equals("status remains pending", updatedInvitation.status, "pending");
    TestValidator.equals("role is assigned", updatedInvitation.role!.id, role.id);
    TestValidator.equals("department is assigned", updatedInvitation.department!.id, department.id);
    TestValidator.equals("position is updated", updatedInvitation.position, newPosition);
    TestValidator.equals("note is updated", updatedInvitation.note, newNote);
    TestValidator.equals("expiresAt is extended", updatedInvitation.expires_at, extendedExpiresAt);
}