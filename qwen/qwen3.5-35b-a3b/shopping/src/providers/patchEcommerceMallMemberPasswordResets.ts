import { IEcommerceMallMemberPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordResetRequest";
import { IEcommerceMallMemberPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordResetResponse";
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

export async function patchEcommerceMallMemberPasswordResets(props: {
  member: MemberPayload;
  body: IEcommerceMallMemberPasswordResetRequest;
}): Promise<IEcommerceMallMemberPasswordResetResponse> {
  const token: string & tags.Format<"uuid"> = v4();
  const hashedToken: string = await PasswordUtil.hash(token);
  const now = new Date();
  const nowString: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const expiresDate = new Date(Date.now() + 60 * 60 * 1000);
  // Delete any existing unused tokens for this email
  await MyGlobal.prisma.ecommerce_mall_member_password_resets.updateMany({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    data: { deleted_at: null },
  });
  // Insert new password reset record
  await MyGlobal.prisma.ecommerce_mall_member_password_resets.create({
    data: {
      id: v4(),
      email: props.body.email,
      token: hashedToken,
      expires_at: expiresDate,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: props.member.id } },
    },
  });
  return {
    message:
      "If the email exists in our system, a password reset link has been sent.",
    reset_requested_at: nowString,
  };
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
// import { IEcommerceMallMemberPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordResetRequest";
// import { IEcommerceMallMemberPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordResetResponse";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: IEcommerceMallMemberPasswordResetRequest;
// }): Promise<IEcommerceMallMemberPasswordResetResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------