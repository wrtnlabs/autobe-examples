import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingInvitationTransformer } from "../transformers/HrmTimeTrackingInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putHrmTimeTrackingMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingInvitation.IUpdate;
}): Promise<IHrmTimeTrackingInvitation> {
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findFirst({
      where: {
        id: props.invitationId,
        deleted_at: null,
      },
    });
  if (invitation === null) {
    throw new HttpException("Invitation not found", 404);
  }
  if (invitation.status !== "pending") {
    throw new HttpException(
      "Only invitations in pending status can be updated",
      422,
    );
  }
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        invitation.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: { id: true, hrm_time_tracking_role_id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "employee:manage",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.roleId !== undefined) {
    const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
      where: {
        id: props.body.roleId,
        hrm_time_tracking_organization_id:
          invitation.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (role === null) {
      throw new HttpException(
        "The specified role does not exist in the organization",
        422,
      );
    }
  }
  if (props.body.status !== undefined && props.body.status !== "cancelled") {
    throw new HttpException(
      "Only 'cancelled' status can be set via this endpoint",
      422,
    );
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_invitations.update({
      where: { id: props.invitationId },
      data: {
        ...(props.body.roleId !== undefined && {
          hrm_time_tracking_role_id: props.body.roleId,
        }),
        ...(props.body.status === "cancelled" && {
          status: "cancelled",
          deleted_at: now,
        }),
        updated_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      ...HrmTimeTrackingInvitationTransformer.select(),
    });
  return await HrmTimeTrackingInvitationTransformer.transform(updated);
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
// import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingMemberInvitationsInvitationId(props: {
//   member: MemberPayload;
//   invitationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingInvitation.IUpdate;
// }): Promise<IHrmTimeTrackingInvitation> {
//   await MyGlobal.prisma.hrm_time_tracking_invitations.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_invitations.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingInvitationTransformer.select(),
//   });
//   return await HrmTimeTrackingInvitationTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------