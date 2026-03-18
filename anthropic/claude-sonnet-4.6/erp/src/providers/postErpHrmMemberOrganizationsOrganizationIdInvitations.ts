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
import { ErpHrmInvitationCollector } from "../collectors/ErpHrmInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationTransformer } from "../transformers/ErpHrmInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationsOrganizationIdInvitations(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmInvitation.ICreate;
}): Promise<IErpHrmInvitation> {
  // Step 1: Resolve the authenticated member's org member record
  const invitingOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (invitingOrgMember === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Step 2: Check employee:manage permission
  const hasPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: invitingOrgMember.role_id,
        permission_code: "employee:manage",
      },
      select: { id: true },
    });
  if (hasPermission === null) {
    throw new HttpException(
      "You do not have permission to invite employees",
      403,
    );
  }
  // Step 3: Validate organization exists and is not soft-deleted
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 4: Validate roleId references a role scoped to this organization
  const targetRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.body.roleId,
      erp_hrm_organization_id: props.organizationId,
    },
    select: { id: true },
  });
  if (targetRole === null) {
    throw new HttpException(
      "The specified role does not exist in this organization",
      422,
    );
  }
  // Step 5: Check for duplicate pending invitation
  const duplicatePending = await MyGlobal.prisma.erp_hrm_invitations.findFirst({
    where: {
      erp_hrm_organization_id: props.organizationId,
      email: props.body.email,
      status: "pending",
    },
    select: { id: true },
  });
  if (duplicatePending !== null) {
    throw new HttpException(
      "A pending invitation already exists for this email in this organization",
      409,
    );
  }
  // Step 6: Check if email matches an existing active member
  const existingMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: { id: true },
  });
  let createdInvitationId: string;
  if (existingMember === null) {
    // Pending flow: no existing account found — create invitation with status='pending'
    const created = await MyGlobal.prisma.erp_hrm_invitations.create({
      data: await ErpHrmInvitationCollector.collect({
        body: props.body,
        erpHrmOrganizations: { id: props.organizationId },
        erpHrmOrganizationMembers: { id: invitingOrgMember.id },
        erpHrmMemberSessions: { id: props.member.session_id },
      }),
      select: { id: true },
    });
    createdInvitationId = created.id;
  } else {
    // Direct-add flow: existing account found
    // Check not already a member of this org (respects DB unique constraint regardless of deleted_at)
    const alreadyMember =
      await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
        where: {
          organization_id: props.organizationId,
          member_id: existingMember.id,
        },
        select: { id: true },
      });
    if (alreadyMember !== null) {
      throw new HttpException(
        "The invited user is already a member of this organization",
        409,
      );
    }
    // Atomic transaction: create invitation (accepted) + create org member
    const newInvitationId = v4();
    const newOrgMemberId = v4();
    const now = new Date();
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.erp_hrm_invitations.create({
        data: {
          id: newInvitationId,
          email: props.body.email,
          status: "accepted",
          created_at: now,
          updated_at: now,
          organization: { connect: { id: props.organizationId } },
          invitingMember: { connect: { id: invitingOrgMember.id } },
          member: { connect: { id: existingMember.id } },
        },
      }),
      MyGlobal.prisma.erp_hrm_organization_members.create({
        data: {
          id: newOrgMemberId,
          employment_type: props.body.employmentType,
          status: "active",
          position: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          organization: { connect: { id: props.organizationId } },
          member: { connect: { id: existingMember.id } },
          role: { connect: { id: props.body.roleId } },
        },
      }),
    ]);
    createdInvitationId = newInvitationId;
  }
  // Fetch and return the created invitation with full detail
  const invitation =
    await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
      where: { id: createdInvitationId },
      ...ErpHrmInvitationTransformer.select(),
    });
  return ErpHrmInvitationTransformer.transform(invitation);
}
