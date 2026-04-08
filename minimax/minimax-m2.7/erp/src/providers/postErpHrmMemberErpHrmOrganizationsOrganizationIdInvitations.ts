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
import { ErpHrmInvitationCollector } from "../collectors/ErpHrmInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationTransformer } from "../transformers/ErpHrmInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberErpHrmOrganizationsOrganizationIdInvitations(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmInvitation.ICreate;
}): Promise<IErpHrmInvitation> {
  // 1. Verify organization exists
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
    });
  // 2. Check for duplicate pending invitation
  const existingInvitation =
    await MyGlobal.prisma.erp_hrm_invitations.findFirst({
      where: {
        erp_hrm_organization_id: props.organizationId,
        email: props.body.email,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingInvitation) {
    throw new HttpException(
      "Duplicate pending invitation exists for this email",
      409,
    );
  }
  // 3. Validate roleId if provided
  if (props.body.roleId) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        id: props.body.roleId,
        erp_hrm_organization_id: props.organizationId,
        deleted_at: null,
      },
    });
    if (!role) {
      throw new HttpException("Role not found or not in organization", 400);
    }
  }
  // 4. Validate departmentId if provided
  if (props.body.departmentId) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: props.body.departmentId,
        erp_hrm_organization_id: props.organizationId,
        deleted_at: null,
      },
    });
    if (!department) {
      throw new HttpException(
        "Department not found or not in organization",
        400,
      );
    }
  }
  // 5. Calculate expiration date (30 days from now)
  const expiresAtDate = new Date();
  expiresAtDate.setDate(expiresAtDate.getDate() + 30);
  // 6. Create IEntity object for collector
  const organizationEntity: IEntity = {
    id: organization.id,
  };
  // 7. Create invitation using collector
  const invitationData = await ErpHrmInvitationCollector.collect({
    body: props.body,
    organization: organizationEntity,
  });
  // Override expires_at with calculated value
  (invitationData as any).expires_at = expiresAtDate;
  const createdInvitation = await MyGlobal.prisma.erp_hrm_invitations.create({
    data: invitationData,
    ...ErpHrmInvitationTransformer.select(),
  });
  // 8. Check if member exists with matching email
  const existingMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  // 9. If member exists, create employee and update invitation to accepted
  if (existingMember) {
    // Find default Employee role
    const defaultRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        erp_hrm_organization_id: props.organizationId,
        name: "Employee",
        deleted_at: null,
      },
    });
    // Use provided roleId or default role
    const assignedRoleId = props.body.roleId ?? defaultRole?.id;
    if (!assignedRoleId) {
      throw new HttpException(
        "No valid role available for employee assignment",
        400,
      );
    }
    // Create employee record
    const now = new Date();
    await MyGlobal.prisma.erp_hrm_employees.create({
      data: {
        id: v4(),
        erp_hrm_member_id: existingMember.id,
        erp_hrm_organization_id: props.organizationId,
        erp_hrm_role_id: assignedRoleId,
        erp_hrm_department_id: props.body.departmentId ?? null,
        position: props.body.position ?? null,
        employment_type: "full-time",
        status: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Update invitation to accepted
    const acceptedAt = new Date();
    const updatedNow = new Date();
    const updatedInvitation = await MyGlobal.prisma.erp_hrm_invitations.update({
      where: { id: createdInvitation.id },
      data: {
        status: "accepted",
        accepted_at: acceptedAt,
        updated_at: updatedNow,
      },
      ...ErpHrmInvitationTransformer.select(),
    });
    // 10. Log activity
    await MyGlobal.prisma.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        erp_hrm_organization_id: props.organizationId,
        erp_hrm_member_id: props.member.id,
        action_type: "employee_invited",
        target_entity_type: "employee",
        target_entity_id: existingMember.id,
        details: JSON.stringify({ email: props.body.email }),
        created_at: new Date(),
      },
    });
    // 11. Return transformed result
    return await ErpHrmInvitationTransformer.transform(updatedInvitation);
  }
  // No existing member - return pending invitation
  // 10. Log activity
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      erp_hrm_organization_id: props.organizationId,
      erp_hrm_member_id: props.member.id,
      action_type: "employee_invited",
      target_entity_type: "invitation",
      target_entity_id: createdInvitation.id,
      details: JSON.stringify({ email: props.body.email }),
      created_at: new Date(),
    },
  });
  // 11. Return transformed result
  return await ErpHrmInvitationTransformer.transform(createdInvitation);
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
// export async function postErpHrmMemberErpHrmOrganizationsOrganizationIdInvitations(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IErpHrmInvitation.ICreate;
// }): Promise<IErpHrmInvitation> {
//   const record = await MyGlobal.prisma.erp_hrm_invitations.create({
//     data: await ErpHrmInvitationCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmInvitationTransformer.select(),
//   });
//   return await ErpHrmInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------