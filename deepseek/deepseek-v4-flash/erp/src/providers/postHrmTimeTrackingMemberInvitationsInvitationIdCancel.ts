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

export async function postHrmTimeTrackingMemberInvitationsInvitationIdCancel(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingInvitation> {
  // 1. Load the invitation (must exist and not be soft-deleted)
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findFirstOrThrow({
      where: {
        id: props.invitationId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  // 2. Verify the authenticated member has employee:manage permission
  //    in the organization that owns this invitation
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
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "employee:manage",
        deleted_at: null,
      },
    });
  if (permission === null) {
    throw new HttpException(
      "You lack the required permission to cancel invitations",
      403,
    );
  }
  // 3. Validate that the invitation is in 'pending' status
  if (invitation.status !== "pending") {
    throw new HttpException(
      "Only pending invitations can be cancelled. Current status: " +
        invitation.status,
      422,
    );
  }
  // 4. Update the invitation: set status to 'cancelled' and updated_at to current ISO string
  await MyGlobal.prisma.hrm_time_tracking_invitations.update({
    where: { id: props.invitationId },
    data: {
      status: "cancelled",
      updated_at: new Date().toISOString(),
    },
  });
  // 5. Re-fetch and return the updated invitation entity
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
// export async function postHrmTimeTrackingMemberInvitationsInvitationIdCancel(props: {
//   member: MemberPayload;
//   invitationId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingInvitation> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_invitations.findFirstOrThrow({
//     ...HrmTimeTrackingInvitationTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------