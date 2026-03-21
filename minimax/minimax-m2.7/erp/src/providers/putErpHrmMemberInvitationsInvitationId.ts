import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationTransformer } from "../transformers/ErpHrmInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
  body: IErpHrmInvitation.IUpdate;
}): Promise<IErpHrmInvitation> {
  // 1. Lookup invitation and verify it exists
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findFirst({
    where: {
      id: props.invitationId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      status: true,
    },
  });
  if (!invitation) {
    throw new HttpException("Invitation not found", 404);
  }
  // 2. Get member's employee record with role and permissions for this organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: invitation.erp_hrm_organization_id,
      deleted_at: null,
    },
    include: {
      role: {
        include: {
          rolePermissions: true,
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check if member has employee:manage permission
  const hasPermission = employee.role?.rolePermissions.some(
    (rp) => rp.permission === "employee:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify invitation is in pending status
  if (invitation.status !== "pending") {
    throw new HttpException(
      "Cannot update invitation that is not pending",
      409,
    );
  }
  // 5. Validate role if provided
  if (
    props.body.erpHrmRoleId !== undefined &&
    props.body.erpHrmRoleId !== null
  ) {
    const roleExists = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        id: props.body.erpHrmRoleId,
        erp_hrm_organization_id: invitation.erp_hrm_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!roleExists) {
      throw new HttpException(
        "Role does not exist or does not belong to this organization",
        422,
      );
    }
  }
  // 6. Validate department if provided
  if (
    props.body.erpHrmDepartmentId !== undefined &&
    props.body.erpHrmDepartmentId !== null
  ) {
    const departmentExists =
      await MyGlobal.prisma.erp_hrm_departments.findFirst({
        where: {
          id: props.body.erpHrmDepartmentId,
          erp_hrm_organization_id: invitation.erp_hrm_organization_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!departmentExists) {
      throw new HttpException(
        "Department does not exist or does not belong to this organization",
        422,
      );
    }
  }
  // 7. Build update data from body - only include fields that are defined
  const updateData: {
    updated_at: Date;
    erp_hrm_role_id?: string | null;
    erp_hrm_department_id?: string | null;
    position?: string | null;
    note?: string | null;
    expires_at?: Date | null;
  } = {
    updated_at: new Date(),
  };
  if (props.body.erpHrmRoleId !== undefined) {
    updateData.erp_hrm_role_id = props.body.erpHrmRoleId;
  }
  if (props.body.erpHrmDepartmentId !== undefined) {
    updateData.erp_hrm_department_id = props.body.erpHrmDepartmentId;
  }
  if (props.body.position !== undefined) {
    updateData.position = props.body.position;
  }
  if (props.body.note !== undefined) {
    updateData.note = props.body.note;
  }
  if (props.body.expiresAt !== undefined) {
    updateData.expires_at = props.body.expiresAt
      ? new Date(props.body.expiresAt)
      : null;
  }
  // 8. Update the invitation
  await MyGlobal.prisma.erp_hrm_invitations.update({
    where: { id: props.invitationId },
    data: updateData,
  });
  // 9. Fetch complete updated invitation with relations using transformer
  const updatedInvitation =
    await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      ...ErpHrmInvitationTransformer.select(),
    });
  // 10. Transform and return
  return await ErpHrmInvitationTransformer.transform(updatedInvitation);
}
