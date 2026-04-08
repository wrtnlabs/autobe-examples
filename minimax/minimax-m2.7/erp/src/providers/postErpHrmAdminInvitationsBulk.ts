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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmInvitationAtSummaryTransformer } from "../transformers/ErpHrmInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminInvitationsBulk(props: {
  admin: AdminPayload;
  body: IErpHrmInvitation.IBulkCreate;
}): Promise<IErpHrmInvitation.IBulkCreateResult> {
  const admin = await MyGlobal.prisma.erp_hrm_admins.findFirstOrThrow({
    where: { id: props.admin.id },
    select: { id: true },
  });
  await MyGlobal.prisma.erp_hrm_admin_sessions.findFirstOrThrow({
    where: { id: props.admin.session_id },
    select: { id: true },
  });
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    select: { id: true },
  });
  if (!organization) {
    throw new HttpException("No organization found", 400);
  }
  const organizationId = organization.id;
  const invitations: IErpHrmInvitation.IBulkCreate[] = Array.isArray(props.body)
    ? props.body
    : [props.body];
  const defaultRole = await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      erp_hrm_organization_id: organizationId,
      name: "Employee",
      deleted_at: null,
    },
    select: { id: true },
  });
  const failures: IErpHrmInvitation.IBulkCreateFailure[] = [];
  const createdInvitations: ErpHrmInvitationAtSummaryTransformer.Payload[] = [];
  for (const item of invitations) {
    try {
      const result = await processInvitation({
        organizationId,
        item,
        defaultRoleId: defaultRole.id,
      });
      if (result.invitation) {
        createdInvitations.push(result.invitation);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const code = extractErrorCode(errorMessage);
      failures.push({
        email: item.email satisfies string as string & tags.Format<"idn-email">,
        error: { code, message: errorMessage },
      });
    }
  }
  const successes = await ArrayUtil.asyncMap(
    createdInvitations,
    ErpHrmInvitationAtSummaryTransformer.transform,
  );
  return { failures, successes };
}
function extractErrorCode(message: string): string {
  if (message.includes("DUPLICATE_EMAIL")) return "DUPLICATE_EMAIL";
  if (message.includes("EXISTING_EMPLOYEE")) return "EXISTING_EMPLOYEE";
  if (message.includes("INVALID_FORMAT")) return "INVALID_FORMAT";
  return "PROCESSING_ERROR";
}
async function processInvitation(props: {
  organizationId: string & tags.Format<"uuid">;
  item: IErpHrmInvitation.IBulkCreate;
  defaultRoleId: string & tags.Format<"uuid">;
}): Promise<{
  invitation: ErpHrmInvitationAtSummaryTransformer.Payload | null;
}> {
  const { organizationId, item, defaultRoleId } = props;
  const expiresAt = item.expiresAt ?? null;
  const existingPending = await MyGlobal.prisma.erp_hrm_invitations.findFirst({
    where: {
      erp_hrm_organization_id: organizationId,
      email: item.email,
      status: "pending",
      deleted_at: null,
    },
  });
  if (existingPending)
    throw new Error(
      "DUPLICATE_EMAIL: A pending invitation already exists for this email",
    );
  const existingAccepted = await MyGlobal.prisma.erp_hrm_invitations.findFirst({
    where: {
      erp_hrm_organization_id: organizationId,
      email: item.email,
      status: "accepted",
      deleted_at: null,
    },
  });
  if (existingAccepted)
    throw new Error(
      "DUPLICATE_EMAIL: An employee already exists with this email in the organization",
    );
  const existingMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: item.email, deleted_at: null },
    select: { id: true },
  });
  const roleId = item.erpHrmRoleId ?? defaultRoleId;
  const departmentId = item.erpHrmDepartmentId ?? null;
  const position = item.position ?? null;
  const note = item.note ?? null;
  if (existingMember) {
    const existingEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: existingMember.id,
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
    });
    if (existingEmployee)
      throw new Error(
        "EXISTING_EMPLOYEE: This user is already an employee in the organization",
      );
    const employeeId = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.erp_hrm_employees.create({
      data: {
        id: employeeId,
        erp_hrm_member_id: existingMember.id,
        erp_hrm_organization_id: organizationId,
        erp_hrm_role_id: roleId,
        erp_hrm_department_id: departmentId,
        position: position,
        employment_type: "full-time",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    const invitationId = v4() as string & tags.Format<"uuid">;
    const invitation = await MyGlobal.prisma.erp_hrm_invitations.create({
      data: {
        id: invitationId,
        erp_hrm_organization_id: organizationId,
        erp_hrm_role_id: roleId,
        erp_hrm_department_id: departmentId,
        email: item.email,
        status: "accepted",
        token: null,
        position: position,
        note: note,
        accepted_at: new Date(),
        expires_at: expiresAt ? new Date(expiresAt) : null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...ErpHrmInvitationAtSummaryTransformer.select(),
    });
    return { invitation };
  } else {
    const invitationId = v4() as string & tags.Format<"uuid">;
    const token = v4();
    const invitation = await MyGlobal.prisma.erp_hrm_invitations.create({
      data: {
        id: invitationId,
        erp_hrm_organization_id: organizationId,
        erp_hrm_role_id: roleId,
        erp_hrm_department_id: departmentId,
        email: item.email,
        status: "pending",
        token: token,
        position: position,
        note: note,
        accepted_at: null,
        expires_at: expiresAt ? new Date(expiresAt) : null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...ErpHrmInvitationAtSummaryTransformer.select(),
    });
    return { invitation };
  }
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
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminInvitationsBulk(props: {
//   admin: AdminPayload;
//   body: IErpHrmInvitation.IBulkCreate;
// }): Promise<IErpHrmInvitation.IBulkCreateResult> {
//   return {
//     failures: ...,
//     successes: await ArrayUtil.asyncMap(..., (r) => ErpHrmInvitationAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------