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

export async function postErpHrmMemberInvitationsInvitationIdRevoke(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmInvitation> {
  // Step 1: Get the employee's organization context from employee record
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Retrieve the invitation by ID with scalar FK for ownership check
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findUnique({
    where: { id: props.invitationId },
    select: {
      id: true,
      email: true,
      status: true,
      deleted_at: true,
      erp_hrm_organization_id: true,
    },
  });
  // Step 3: Verify invitation exists
  if (!invitation) {
    throw new HttpException("Invitation not found", 404);
  }
  // Step 4: Verify invitation belongs to the same organization
  if (invitation.erp_hrm_organization_id !== employee.erp_hrm_organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Verify invitation status is 'pending'
  if (invitation.status !== "pending") {
    throw new HttpException(
      `Cannot revoke invitation with status: ${invitation.status}`,
      400,
    );
  }
  // Step 6: Verify invitation is not already deleted
  if (invitation.deleted_at !== null) {
    throw new HttpException("Invitation already revoked", 400);
  }
  // Step 7: Soft delete the invitation (revoke) using transformer for response
  const revokedInvitation = await MyGlobal.prisma.erp_hrm_invitations.update({
    where: { id: props.invitationId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
    ...ErpHrmInvitationTransformer.select(),
  });
  // Step 8: Create activity log entry for the revocation
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      erp_hrm_member_id: props.member.id,
      action_type: "invitation_revoked",
      target_entity_type: "invitation",
      target_entity_id: invitation.id,
      details: JSON.stringify({
        invited_email: invitation.email,
        revoked_at: new Date().toISOString(),
      }),
      created_at: new Date(),
    },
  });
  // Step 9: Return the revoked invitation
  return await ErpHrmInvitationTransformer.transform(revokedInvitation);
}
