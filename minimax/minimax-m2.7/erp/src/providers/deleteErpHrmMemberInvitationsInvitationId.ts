import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get member's employee record with role permissions to verify employee:manage
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      role: {
        select: {
          id: true,
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member has employee:manage permission
  const hasPermission = employee.role.rolePermissions.some(
    (rp) => rp.permission === "employee:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the invitation
  const invitation =
    await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        status: true,
      },
    });
  // Verify invitation belongs to the current organization
  if (invitation.erp_hrm_organization_id !== employee.erp_hrm_organization_id) {
    throw new HttpException("Not Found", 404);
  }
  // Only pending invitations can be cancelled
  if (invitation.status !== "pending") {
    throw new HttpException("Only pending invitations can be cancelled", 400);
  }
  // Delete the invitation (cascade will handle related records)
  await MyGlobal.prisma.erp_hrm_invitations.delete({
    where: { id: props.invitationId },
  });
}
