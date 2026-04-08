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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeInvitationTransformer } from "../transformers/HrmEmployeeInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberInvitationsInvitationIdAccept(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
  body: IHrmEmployeeInvitation.IAccept;
}): Promise<IHrmEmployeeInvitation> {
  const now = new Date().toISOString();
  const invitation = await MyGlobal.prisma.hrm_employee_invitations.findFirst({
    where: {
      id: props.invitationId,
      deleted_at: null,
    },
    ...HrmEmployeeInvitationTransformer.select(),
  });
  if (invitation === null) {
    throw new HttpException("Invitation not found", 404);
  }
  if (invitation.status !== "pending") {
    throw new HttpException("Invitation is not pending", 400);
  }
  const expiresAt = new Date(invitation.expires_at).toISOString();
  if (expiresAt <= now) {
    throw new HttpException("Invitation has expired", 400);
  }
  if (invitation.token !== props.body.token) {
    throw new HttpException("Invalid token", 401);
  }
  const member = await MyGlobal.prisma.hrm_members.findUnique({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  if (member.email !== invitation.email) {
    throw new HttpException("Email mismatch", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const currentInvitation = await tx.hrm_employee_invitations.findUnique({
      where: { id: props.invitationId },
    });
    if (currentInvitation === null) {
      throw new HttpException("Invitation not found", 404);
    }
    if (currentInvitation.status !== "pending") {
      throw new HttpException("Invitation is not pending", 400);
    }
    const currentExpiresAt = new Date(
      currentInvitation.expires_at,
    ).toISOString();
    if (currentExpiresAt <= now) {
      throw new HttpException("Invitation has expired", 400);
    }
    if (currentInvitation.token !== props.body.token) {
      throw new HttpException("Invalid token", 401);
    }
    await tx.hrm_employee_invitations.update({
      where: { id: props.invitationId },
      data: {
        status: "accepted",
        member_id: props.member.id,
        updated_at: new Date(),
      },
    });
    const existingEmployee = await tx.hrm_employees.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: currentInvitation.organization_id,
          user_id: props.member.id,
        },
      },
    });
    if (existingEmployee === null) {
      await tx.hrm_employees.create({
        data: {
          id: v4(),
          organization_id: currentInvitation.organization_id,
          user_id: props.member.id,
          role_id: currentInvitation.role_id,
          department_id: null,
          position: "",
          employment_type: "full-time",
          status: "active",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  });
  const updatedInvitation =
    await MyGlobal.prisma.hrm_employee_invitations.findUnique({
      where: { id: props.invitationId },
      ...HrmEmployeeInvitationTransformer.select(),
    });
  if (updatedInvitation === null) {
    throw new HttpException("Invitation not found", 404);
  }
  return await HrmEmployeeInvitationTransformer.transform(updatedInvitation);
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
// export async function patchHrmMemberInvitationsInvitationIdAccept(props: {
//   member: MemberPayload;
//   invitationId: string & tags.Format<"uuid">;
//   body: IHrmEmployeeInvitation.IAccept;
// }): Promise<IHrmEmployeeInvitation> {
//   const record = await MyGlobal.prisma.hrm_employee_invitations.findFirstOrThrow({
//     ...HrmEmployeeInvitationTransformer.select(),
//     where: { ... },
//   });
//   return await HrmEmployeeInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------