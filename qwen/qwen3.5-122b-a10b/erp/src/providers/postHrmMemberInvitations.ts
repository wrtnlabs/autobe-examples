import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmEmployeeInvitationCollector } from "../collectors/HrmEmployeeInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeInvitationTransformer } from "../transformers/HrmEmployeeInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmEmployeeInvitation.ICreate;
}): Promise<IHrmEmployeeInvitation> {
  // Get member's employee record to find organization_id
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Member not found as employee", 404);
  }
  const organizationId = employee.organization_id;
  // Verify role exists in organization
  const role = await MyGlobal.prisma.hrm_roles.findFirst({
    where: {
      id: props.body.role_id,
      hrm_organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (!role) {
    throw new HttpException("Role not found in organization", 404);
  }
  // Check for existing pending invitation
  const existing = await MyGlobal.prisma.hrm_employee_invitations.findFirst({
    where: {
      email: props.body.email,
      organization_id: organizationId,
      status: "pending",
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(
      "Pending invitation already exists for this email",
      409,
    );
  }
  // Query organization and member records for collector
  const organization =
    await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
      where: { id: organizationId },
    });
  const inviter = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
  });
  // Create invitation using collector
  const record = await MyGlobal.prisma.hrm_employee_invitations.create({
    data: await HrmEmployeeInvitationCollector.collect({
      body: props.body,
      organization,
      inviter,
    }),
    ...HrmEmployeeInvitationTransformer.select(),
  });
  return await HrmEmployeeInvitationTransformer.transform(record);
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
// import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberInvitations(props: {
//   member: MemberPayload;
//   body: IHrmEmployeeInvitation.ICreate;
// }): Promise<IHrmEmployeeInvitation> {
//   const record = await MyGlobal.prisma.hrm_employee_invitations.create({
//     data: await HrmEmployeeInvitationCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmEmployeeInvitationTransformer.select(),
//   });
//   return await HrmEmployeeInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------