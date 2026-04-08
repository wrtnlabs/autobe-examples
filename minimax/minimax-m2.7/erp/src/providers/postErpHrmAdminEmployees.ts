import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
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
import { ErpHrmInvitationTransformer } from "../transformers/ErpHrmInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminEmployees(props: {
  admin: AdminPayload;
  body: IErpHrmEmployee.ICreate;
}): Promise<IErpHrmInvitation> {
  // Verify admin exists
  await MyGlobal.prisma.erp_hrm_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
  });
  // Get organization context - admins are organization owners,
  // query org where the owner's member id matches
  const orgRecord = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: {
      owner: {
        id: props.admin.id,
      },
    },
    select: { id: true },
  });
  if (!orgRecord) {
    throw new HttpException("Organization not found for admin", 404);
  }
  const orgId = orgRecord.id;
  // Validate role exists
  await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.body.roleId },
  });
  // Look up member by email
  const member = await MyGlobal.prisma.erp_hrm_members.findUnique({
    where: { email: props.body.email },
  });
  // If member exists, check if already an employee in this organization
  if (member) {
    const existingEmployee = await MyGlobal.prisma.erp_hrm_employees.findUnique(
      {
        where: {
          erp_hrm_member_id_erp_hrm_organization_id: {
            erp_hrm_member_id: member.id,
            erp_hrm_organization_id: orgId,
          },
        },
      },
    );
    if (existingEmployee) {
      throw new HttpException(
        "Member is already an employee in this organization",
        409,
      );
    }
    // Create employee record
    await MyGlobal.prisma.erp_hrm_employees.create({
      data: {
        id: v4(),
        erp_hrm_member_id: member.id,
        erp_hrm_organization_id: orgId,
        erp_hrm_role_id: props.body.roleId,
        erp_hrm_department_id: props.body.departmentId ?? undefined,
        position: props.body.position ?? undefined,
        employment_type: props.body.employmentType,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: undefined,
      },
    });
    // Create invitation record with status='accepted' for response
    const invitation = await MyGlobal.prisma.erp_hrm_invitations.create({
      data: {
        id: v4(),
        erp_hrm_organization_id: orgId,
        erp_hrm_role_id: props.body.roleId,
        erp_hrm_department_id: props.body.departmentId ?? undefined,
        email: props.body.email,
        status: "accepted",
        token: undefined,
        position: props.body.position ?? undefined,
        note: undefined,
        accepted_at: new Date(),
        expires_at: undefined,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: undefined,
      },
      ...ErpHrmInvitationTransformer.select(),
    });
    return await ErpHrmInvitationTransformer.transform(invitation);
  }
  // Member doesn't exist - create invitation with status='pending'
  const secureToken = Array.from(
    { length: 64 },
    () => Math.random().toString(16)[2],
  ).join("");
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  // Check for existing invitation
  const existingInvitation =
    await MyGlobal.prisma.erp_hrm_invitations.findUnique({
      where: {
        erp_hrm_organization_id_email: {
          erp_hrm_organization_id: orgId,
          email: props.body.email,
        },
      },
    });
  if (existingInvitation) {
    throw new HttpException(
      "An invitation has already been sent to this email",
      409,
    );
  }
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.create({
    data: {
      id: v4(),
      erp_hrm_organization_id: orgId,
      erp_hrm_role_id: props.body.roleId,
      erp_hrm_department_id: props.body.departmentId ?? undefined,
      email: props.body.email,
      status: "pending",
      token: secureToken,
      position: props.body.position ?? undefined,
      note: undefined,
      accepted_at: undefined,
      expires_at: expirationDate,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
    },
    ...ErpHrmInvitationTransformer.select(),
  });
  return await ErpHrmInvitationTransformer.transform(invitation);
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminEmployees(props: {
//   admin: AdminPayload;
//   body: IErpHrmEmployee.ICreate;
// }): Promise<IErpHrmInvitation> {
//   const record = await MyGlobal.prisma.erp_hrm_employees.create({
//     data: await ErpHrmEmployeeCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmInvitationTransformer.select(),
//   });
//   return await ErpHrmInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------