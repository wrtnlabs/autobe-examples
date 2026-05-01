import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberEmailVerificationTransformer } from "../transformers/ErpHrmMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IErpHrmMemberEmailVerification.ICreate;
}): Promise<IErpHrmMemberEmailVerification> {
  const verification =
    await MyGlobal.prisma.erp_hrm_member_email_verifications.findUnique({
      where: { token: props.body.token },
      ...ErpHrmMemberEmailVerificationTransformer.select(),
    });
  if (verification === null) {
    throw new HttpException("Invalid verification token", 400);
  }
  if (verification.expires_at < new Date()) {
    throw new HttpException("Verification token has expired", 400);
  }
  if (verification.verified_at !== null) {
    return await ErpHrmMemberEmailVerificationTransformer.transform(
      verification,
    );
  }
  const updated =
    await MyGlobal.prisma.erp_hrm_member_email_verifications.update({
      where: { id: verification.id },
      data: {
        verified_at: new Date(),
        updated_at: new Date(),
      },
      ...ErpHrmMemberEmailVerificationTransformer.select(),
    });
  // Note: Automatic invitation matching (erp_hrm_invitations) is not implemented
  // as the invitations table does not yet exist in the database schema.
  return await ErpHrmMemberEmailVerificationTransformer.transform(updated);
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
// import { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: IErpHrmMemberEmailVerification.ICreate;
// }): Promise<IErpHrmMemberEmailVerification> {
//   const record = await MyGlobal.prisma.erp_hrm_member_email_verifications.create({
//     data: await ErpHrmMemberEmailVerificationCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmMemberEmailVerificationTransformer.select(),
//   });
//   return await ErpHrmMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------