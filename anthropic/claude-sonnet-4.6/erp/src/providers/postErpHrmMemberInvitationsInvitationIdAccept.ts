import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function postErpHrmMemberInvitationsInvitationIdAccept(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmInvitation> {
  // 1. Load the invitation record
  const invitation =
    await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        email: true,
        status: true,
      },
    });
  // 2. Find acting member's org membership in the invitation's organization
  const actingMembership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: invitation.erp_hrm_organization_id,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            permissions: {
              select: {
                permission_code: true,
              },
            },
          },
        },
      },
    });
  // 3. Verify the acting member belongs to this organization and has employee:manage permission
  if (actingMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission = actingMembership.role.permissions.some(
    (p) => p.permission_code === "employee:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check the invitation is in pending status
  if (invitation.status !== "pending") {
    throw new HttpException(
      "Invitation is not in pending status and cannot be accepted",
      422,
    );
  }
  // 5. Find the registered member account by the invitation's email
  const inviteeMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: invitation.email,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (inviteeMember === null) {
    throw new HttpException(
      "No registered account found for the invited email address. The invitee must register first.",
      422,
    );
  }
  // 6. Execute transaction: update invitation + ensure org membership
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 6a. Update invitation to accepted
    await tx.erp_hrm_invitations.update({
      where: { id: props.invitationId },
      data: {
        status: "accepted",
        erp_hrm_member_id: inviteeMember.id,
        updated_at: new Date(),
      },
    });
    // 6b. Check if org member already exists
    const existingOrgMember = await tx.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: invitation.erp_hrm_organization_id,
        member_id: inviteeMember.id,
      },
      select: { id: true },
    });
    if (existingOrgMember === null) {
      // Find the built-in Employee role for this organization
      const employeeRole = await tx.erp_hrm_roles.findFirstOrThrow({
        where: {
          erp_hrm_organization_id: invitation.erp_hrm_organization_id,
          name: "Employee",
          is_builtin: true,
        },
        select: { id: true },
      });
      // Create the org member record
      await tx.erp_hrm_organization_members.create({
        data: {
          id: v4(),
          organization: { connect: { id: invitation.erp_hrm_organization_id } },
          member: { connect: { id: inviteeMember.id } },
          role: { connect: { id: employeeRole.id } },
          employment_type: "full-time",
          status: "active",
          position: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  });
  // 7. Fetch and return the updated invitation using the transformer
  const updated = await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
    where: { id: props.invitationId },
    ...ErpHrmInvitationTransformer.select(),
  });
  return ErpHrmInvitationTransformer.transform(updated);
}
