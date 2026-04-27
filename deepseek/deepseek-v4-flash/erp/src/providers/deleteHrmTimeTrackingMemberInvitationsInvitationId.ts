import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Load invitation (must exist and not soft-deleted)
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findFirstOrThrow({
      where: {
        id: props.invitationId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        status: true,
        email: true,
      },
    });
  // Step 2: Tenant isolation — member must belong to the invitation's organization
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id:
          invitation.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_role_id: true,
      },
    });
  // Step 3: Authorize — member's role must have employee:manage permission
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "employee:manage",
        deleted_at: null,
      },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Validate — only pending invitations can be cancelled
  if (invitation.status !== "pending") {
    throw new HttpException(
      `Cannot cancel invitation with status "${invitation.status}". Only pending invitations can be cancelled.`,
      422,
    );
  }
  // Step 5: Soft-delete the invitation
  await MyGlobal.prisma.hrm_time_tracking_invitations.update({
    where: { id: invitation.id },
    data: {
      status: "cancelled",
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    } satisfies Prisma.hrm_time_tracking_invitationsUpdateInput,
  });
  // Step 6: Record activity log entry for audit trail
  const activityLogType =
    await MyGlobal.prisma.hrm_time_tracking_activity_log_types.findFirst({
      where: {
        code: "invitation.cancelled",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (activityLogType !== null) {
    await MyGlobal.prisma.hrm_time_tracking_activity_logs.create({
      data: {
        id: v4(),
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_activity_log_type_id: activityLogType.id,
        hrm_time_tracking_organization_id:
          invitation.hrm_time_tracking_organization_id,
        target_entity_type: "Invitation",
        target_entity_id: invitation.id,
        target_entity_name: invitation.email,
        details: `Invitation to ${invitation.email} cancelled`,
        created_at: toISOStringSafe(new Date()),
      },
    });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmTimeTrackingMemberInvitationsInvitationId(props: {
//   member: MemberPayload;
//   invitationId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------