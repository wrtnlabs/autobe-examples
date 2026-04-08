import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallMemberPasswordResetTransformer } from "../transformers/EcommerceMallMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallMemberPasswordReset> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_member_password_resets.findFirstOrThrow(
      {
        ...EcommerceMallMemberPasswordResetTransformer.select(),
        where: { id: props.resetId },
      },
    );
  if (record.deleted_at !== null) {
    throw new HttpException("Token has been soft deleted", 403);
  }
  const transformed =
    await EcommerceMallMemberPasswordResetTransformer.transform(record);
  if (transformed.token !== undefined) {
    const token = transformed.token;
    transformed.token = `${token.slice(0, 4)}****${token.slice(-4)}`;
  }
  return transformed;
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
// import { IEcommerceMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordReset";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMemberPasswordResetsResetId(props: {
//   member: MemberPayload;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallMemberPasswordReset> {
//   const record = await MyGlobal.prisma.ecommerce_mall_member_password_resets.findFirstOrThrow({
//     ...EcommerceMallMemberPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallMemberPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------