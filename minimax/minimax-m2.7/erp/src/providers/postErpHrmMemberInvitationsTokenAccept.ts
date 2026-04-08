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

export async function postErpHrmMemberInvitationsTokenAccept(props: {
  member: MemberPayload;
  token: string;
}): Promise<IErpHrmInvitation> {
  // 1. Find invitation by token
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findFirst({
    ...ErpHrmInvitationTransformer.select(),
    where: {
      token: props.token,
      deleted_at: null,
    },
  });
  if (!invitation) {
    throw new HttpException("Invitation not found", 404);
  }
  // 2. Validate invitation status is 'pending'
  if (invitation.status !== "pending") {
    throw new HttpException(
      "Invitation has already been accepted or expired",
      400,
    );
  }
  // 3. Validate invitation has not expired
  const now = new Date();
  if (invitation.expires_at && invitation.expires_at < now) {
    throw new HttpException("Invitation has expired", 400);
  }
  // 4. Get member email to validate
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { id: true, email: true },
  });
  // 5. Validate member email matches invitation email
  if (member.email !== invitation.email) {
    throw new HttpException(
      "You are not authorized to accept this invitation",
      403,
    );
  }
  // 6. Determine role - use invitation role or fetch default 'Employee' role
  let roleId: string;
  if (invitation.role) {
    roleId = invitation.role.id;
  } else {
    const defaultRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        erp_hrm_organization_id: invitation.organization.id,
        name: "Employee",
      },
      select: { id: true },
    });
    if (!defaultRole) {
      throw new HttpException("Default Employee role not found", 500);
    }
    roleId = defaultRole.id;
  }
  // 7. Create employee record with all required fields upfront
  await MyGlobal.prisma.erp_hrm_employees.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member: { connect: { id: props.member.id } },
      organization: { connect: { id: invitation.organization.id } },
      role: { connect: { id: roleId } },
      ...(invitation.position && { position: invitation.position }),
      ...(invitation.department && {
        department: { connect: { id: invitation.department.id } },
      }),
      employment_type: "full-time",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 8. Update invitation status to 'accepted'
  const acceptedTime = new Date();
  await MyGlobal.prisma.erp_hrm_invitations.update({
    where: { id: invitation.id },
    data: {
      status: "accepted",
      accepted_at: acceptedTime,
      updated_at: acceptedTime,
    },
  });
  // 9. Record activity in activity_logs
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization: { connect: { id: invitation.organization.id } },
      member: { connect: { id: props.member.id } },
      action_type: "member_joined",
      target_entity_type: "invitation",
      target_entity_id: invitation.id,
      created_at: new Date(),
    },
  });
  // 10. Fetch updated invitation and return transformed response
  const updatedInvitation =
    await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
      ...ErpHrmInvitationTransformer.select(),
      where: { id: invitation.id },
    });
  return await ErpHrmInvitationTransformer.transform(updatedInvitation);
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
// export async function postErpHrmMemberInvitationsTokenAccept(props: {
//   member: MemberPayload;
//   token: string;
// }): Promise<IErpHrmInvitation> {
//   const record = await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow({
//     ...ErpHrmInvitationTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------