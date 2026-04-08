import { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallMemberEmailVerificationTransformer } from "../transformers/EcommerceMallMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallMemberEmailVerification> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_member_email_verifications.findFirstOrThrow(
      {
        ...EcommerceMallMemberEmailVerificationTransformer.select(),
        where: {
          id: props.verificationId,
          ecommerce_mall_member_id: props.member.id,
        },
      },
    );
  return await EcommerceMallMemberEmailVerificationTransformer.transform(
    record,
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
// import { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMemberEmailVerificationsVerificationId(props: {
//   member: MemberPayload;
//   verificationId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallMemberEmailVerification> {
//   const record = await MyGlobal.prisma.ecommerce_mall_member_email_verifications.findFirstOrThrow({
//     ...EcommerceMallMemberEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------