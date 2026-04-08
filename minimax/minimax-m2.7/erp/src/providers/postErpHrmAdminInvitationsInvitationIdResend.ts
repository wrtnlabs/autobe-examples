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
import { ErpHrmInvitationAtResendResponseTransformer } from "../transformers/ErpHrmInvitationAtResendResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminInvitationsInvitationIdResend(props: {
  admin: AdminPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmInvitation.IResendResponse> {
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow(
    {
      ...ErpHrmInvitationAtResendResponseTransformer.select(),
      where: {
        id: props.invitationId,
        deleted_at: null,
      },
    },
  );
  if (invitation.status !== "pending") {
    throw new HttpException(
      `Cannot resend invitation with status: ${invitation.status}`,
      400,
    );
  }
  const newToken = v4();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_invitations.update({
      where: { id: props.invitationId },
      data: {
        token: newToken,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        organization: { connect: { id: invitation.organization.id } },
        member: { connect: { id: props.admin.id } },
        action_type: "invitation_resent",
        target_entity_type: "invitation",
        target_entity_id: props.invitationId,
        details: JSON.stringify({ email: invitation.email }),
        created_at: new Date(),
      },
    }),
  ]);
  const updatedInvitation =
    await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow({
      ...ErpHrmInvitationAtResendResponseTransformer.select(),
      where: { id: props.invitationId },
    });
  return await ErpHrmInvitationAtResendResponseTransformer.transform(
    updatedInvitation,
  );
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
// export async function postErpHrmAdminInvitationsInvitationIdResend(props: {
//   admin: AdminPayload;
//   invitationId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmInvitation.IResendResponse> {
//   const record = await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow({
//     ...ErpHrmInvitationAtResendResponseTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmInvitationAtResendResponseTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------