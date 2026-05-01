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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ErpHrmMemberEmailVerificationTransformer } from "../transformers/ErpHrmMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmGuestEmailVerificationsVerificationIdVerification(props: {
  guest: GuestPayload;
  verificationId: string;
}): Promise<IErpHrmMemberEmailVerification> {
  const verification =
    await MyGlobal.prisma.erp_hrm_member_email_verifications.findFirst({
      where: { token: props.verificationId },
      ...ErpHrmMemberEmailVerificationTransformer.select(),
    });
  if (verification === null) {
    throw new HttpException("Verification token not found", 404);
  }
  if (verification.verified_at !== null) {
    throw new HttpException("Email has already been verified", 409);
  }
  if (verification.expires_at < new Date()) {
    throw new HttpException("Verification token has expired", 410);
  }
  await MyGlobal.prisma.erp_hrm_member_email_verifications.update({
    where: { id: verification.id },
    data: {
      verified_at: new Date(),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_member_email_verifications.findUniqueOrThrow({
      where: { id: verification.id },
      ...ErpHrmMemberEmailVerificationTransformer.select(),
    });
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
// export async function postErpHrmGuestEmailVerificationsVerificationIdVerification(props: {
//   guest: GuestPayload;
//   verificationId: string;
// }): Promise<IErpHrmMemberEmailVerification> {
//   const record = await MyGlobal.prisma.erp_hrm_member_email_verifications.findFirstOrThrow({
//     ...ErpHrmMemberEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------