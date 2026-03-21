import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Authorization Check - verify employee:manage permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
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
  // 2. Organization Validation
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  // 3. Role Validation
  const role = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.body.roleId,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (role === null) {
    throw new HttpException(
      "Role not found or does not belong to this organization",
      400,
    );
  }
  // 4. Duplicate Check - check for pending invitations
  const existingInvitation =
    await MyGlobal.prisma.erp_hrm_invitations.findFirst({
      where: {
        organization_id: props.organizationId,
        email: props.body.email,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingInvitation !== null) {
    throw new HttpException(
      "A pending invitation already exists for this email in this organization",
      409,
    );
  }
  // 5. Check for Existing User
  const existingMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existingMember !== null) {
    // Check if already an employee of this organization
    const existingEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: existingMember.id,
        erp_hrm_organization_id: props.organizationId,
        deleted_at: null,
      },
    });
    if (existingEmployee !== null) {
      throw new HttpException(
        "User is already a member of this organization",
        409,
      );
    }
    // Create employee record directly for existing user
    await MyGlobal.prisma.erp_hrm_employees.create({
      data: {
        id: v4(),
        erp_hrm_member_id: existingMember.id,
        erp_hrm_organization_id: props.organizationId,
        erp_hrm_role_id: props.body.roleId,
        employment_type: "full_time",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create accepted invitation record for the existing user
    const acceptedInvitation = await MyGlobal.prisma.erp_hrm_invitations.create(
      {
        data: {
          id: v4(),
          organization: { connect: { id: props.organizationId } },
          role: { connect: { id: props.body.roleId } },
          email: props.body.email,
          status: "accepted",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        ...ErpHrmInvitationTransformer.select(),
      },
    );
    return await ErpHrmInvitationTransformer.transform(acceptedInvitation);
  }
  // 6. Create Invitation for new user (pending status)
  const created = await MyGlobal.prisma.erp_hrm_invitations.create({
    data: await ErpHrmInvitationCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: props.organizationId },
    }),
    ...ErpHrmInvitationTransformer.select(),
  });
  // 7. Return Response
  return await ErpHrmInvitationTransformer.transform(created);
}
