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

export async function deleteErpHrmMemberErpHrmOrganizationsOrganizationIdInvitationsInvitationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the invitation and verify it exists
  const invitation =
    await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        status: true,
        email: true,
      },
    });
  // Validate invitation belongs to the specified organization
  if (invitation.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Invitation not found", 404);
  }
  // Validate invitation status is 'pending'
  if (invitation.status !== "pending") {
    throw new HttpException("Only pending invitations can be cancelled", 400);
  }
  // Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());
  // Soft delete the invitation by setting deleted_at timestamp
  await MyGlobal.prisma.erp_hrm_invitations.update({
    where: { id: props.invitationId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Log the cancellation in activity log
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      erp_hrm_organization_id: props.organizationId,
      erp_hrm_member_id: props.member.id,
      action_type: "invitation_cancelled",
      target_entity_type: "invitation",
      target_entity_id: props.invitationId,
      details: JSON.stringify({
        invited_email: invitation.email,
      }),
      created_at: new Date(),
    },
  });
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
// export async function deleteErpHrmMemberErpHrmOrganizationsOrganizationIdInvitationsInvitationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   invitationId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------