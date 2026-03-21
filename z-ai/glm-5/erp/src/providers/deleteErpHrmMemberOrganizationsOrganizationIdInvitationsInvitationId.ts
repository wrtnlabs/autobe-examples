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

export async function deleteErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Get employee record with role to check permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // 2. Check if role has employee:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "employee:manage",
    },
  });
  if (permission === null) {
    throw new HttpException(
      "You do not have permission to manage employees",
      403,
    );
  }
  // 3. Find the invitation and verify it belongs to the organization
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findFirst({
    where: {
      id: props.invitationId,
      organization_id: props.organizationId,
    },
  });
  if (invitation === null) {
    throw new HttpException("Invitation not found in this organization", 404);
  }
  // 4. Check invitation status - can only cancel pending invitations
  if (invitation.status !== "pending") {
    throw new HttpException(
      `Cannot cancel invitation with status '${invitation.status}'`,
      400,
    );
  }
  // 5. Soft delete the invitation by setting status to cancelled
  await MyGlobal.prisma.erp_hrm_invitations.update({
    where: { id: props.invitationId },
    data: {
      status: "cancelled",
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
