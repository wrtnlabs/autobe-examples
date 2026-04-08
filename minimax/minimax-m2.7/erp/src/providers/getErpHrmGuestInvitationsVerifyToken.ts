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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ErpHrmInvitationAtVerifyResponseTransformer } from "../transformers/ErpHrmInvitationAtVerifyResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmGuestInvitationsVerifyToken(props: {
  guest: GuestPayload;
  token: string;
}): Promise<IErpHrmInvitation.IVerifyResponse> {
  const record = await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow({
    ...ErpHrmInvitationAtVerifyResponseTransformer.select(),
    where: {
      token: props.token,
      deleted_at: null,
    },
  });
  if (record.status !== "pending") {
    if (record.status === "expired") {
      throw new HttpException("Invitation has expired", 410);
    }
    throw new HttpException("Invitation already accepted", 410);
  }
  if (record.expires_at && record.expires_at <= new Date()) {
    throw new HttpException("Invitation has expired", 410);
  }
  return await ErpHrmInvitationAtVerifyResponseTransformer.transform(record);
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
// export async function getErpHrmGuestInvitationsVerifyToken(props: {
//   guest: GuestPayload;
//   token: string;
// }): Promise<IErpHrmInvitation.IVerifyResponse> {
//   const record = await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow({
//     ...ErpHrmInvitationAtVerifyResponseTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmInvitationAtVerifyResponseTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------