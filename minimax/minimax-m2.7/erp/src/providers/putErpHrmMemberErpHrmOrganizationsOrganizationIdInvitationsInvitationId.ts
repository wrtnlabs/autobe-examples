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

export async function putErpHrmMemberErpHrmOrganizationsOrganizationIdInvitationsInvitationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
  body: IErpHrmInvitation.IUpdate;
}): Promise<IErpHrmInvitation> {
  // Fetch invitation and verify organization ownership
  const invitation =
    await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        status: true,
      },
    });
  // Validate invitation belongs to the specified organization
  if (invitation.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Invitation not found in this organization", 404);
  }
  // Only pending invitations can be updated
  if (invitation.status !== "pending") {
    throw new HttpException("Only pending invitations can be updated", 400);
  }
  // Validate roleId if provided
  if (props.body.roleId !== undefined && props.body.roleId !== null) {
    const roleExists = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        id: props.body.roleId,
        erp_hrm_organization_id: props.organizationId,
        deleted_at: null,
      },
    });
    if (!roleExists) {
      throw new HttpException("Role not found in this organization", 400);
    }
  }
  // Validate departmentId if provided
  if (
    props.body.departmentId !== undefined &&
    props.body.departmentId !== null
  ) {
    const departmentExists =
      await MyGlobal.prisma.erp_hrm_departments.findFirst({
        where: {
          id: props.body.departmentId,
          erp_hrm_organization_id: props.organizationId,
          deleted_at: null,
        },
      });
    if (!departmentExists) {
      throw new HttpException("Department not found in this organization", 400);
    }
  }
  // Check for duplicate email if being changed
  if (props.body.email !== undefined) {
    const existingInvitation =
      await MyGlobal.prisma.erp_hrm_invitations.findFirst({
        where: {
          erp_hrm_organization_id: props.organizationId,
          email: props.body.email,
          id: { not: props.invitationId },
          status: "pending",
          deleted_at: null,
        },
      });
    if (existingInvitation) {
      throw new HttpException(
        "A pending invitation with this email already exists",
        400,
      );
    }
  }
  // Build update data object with only provided fields
  const updateData: Prisma.erp_hrm_invitationsUpdateInput = {};
  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }
  if (props.body.position !== undefined) {
    updateData.position = props.body.position;
  }
  if (props.body.note !== undefined) {
    updateData.note = props.body.note;
  }
  if (props.body.roleId !== undefined) {
    updateData.role =
      props.body.roleId === null
        ? { disconnect: true }
        : { connect: { id: props.body.roleId } };
  }
  if (props.body.departmentId !== undefined) {
    updateData.department =
      props.body.departmentId === null
        ? { disconnect: true }
        : { connect: { id: props.body.departmentId } };
  }
  // Always update the updated_at timestamp using string format
  updateData.updated_at = toISOStringSafe(new Date());
  // Update the invitation
  await MyGlobal.prisma.erp_hrm_invitations.update({
    where: { id: props.invitationId },
    data: updateData,
  });
  // Fetch and return updated invitation
  const updated = await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
    where: { id: props.invitationId },
    ...ErpHrmInvitationTransformer.select(),
  });
  return ErpHrmInvitationTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberErpHrmOrganizationsOrganizationIdInvitationsInvitationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   invitationId: string & tags.Format<"uuid">;
//   body: IErpHrmInvitation.IUpdate;
// }): Promise<IErpHrmInvitation> {
//   await MyGlobal.prisma.erp_hrm_invitations.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmInvitationTransformer.select(),
//   });
//   return await ErpHrmInvitationTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------