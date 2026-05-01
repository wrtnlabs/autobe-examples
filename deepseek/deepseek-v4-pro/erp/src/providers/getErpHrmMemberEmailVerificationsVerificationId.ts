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

export async function getErpHrmMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmMemberEmailVerification> {
  const record =
    await MyGlobal.prisma.erp_hrm_member_email_verifications.findUniqueOrThrow({
      where: { id: props.verificationId },
      ...ErpHrmMemberEmailVerificationTransformer.select(),
    });
  return await ErpHrmMemberEmailVerificationTransformer.transform(record);
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
// export async function getErpHrmMemberEmailVerificationsVerificationId(props: {
//   member: MemberPayload;
//   verificationId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmMemberEmailVerification> {
//   const record = await MyGlobal.prisma.erp_hrm_member_email_verifications.findFirstOrThrow({
//     ...ErpHrmMemberEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------