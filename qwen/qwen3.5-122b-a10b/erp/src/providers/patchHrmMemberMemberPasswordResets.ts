import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
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

export async function patchHrmMemberMemberPasswordResets(props: {
  member: MemberPayload;
  body: IHrmMemberPasswordReset.IRequest;
}): Promise<void> {
  // 1. Validate password meets policy requirements (minimum 8 characters)
  if (props.body.password.length < 8) {
    throw new HttpException("Password must be at least 8 characters", 400);
  }
  // 2. Find password reset record by token
  const passwordReset =
    await MyGlobal.prisma.hrm_member_password_resets.findUnique({
      where: { token: props.body.token },
    });
  // 3. Validate token exists
  if (passwordReset === null) {
    throw new HttpException("Invalid or expired token", 400);
  }
  // 4. Validate token is not expired
  const now = new Date();
  if (passwordReset.expires_at <= now) {
    throw new HttpException("Token has expired", 400);
  }
  // 5. Validate token is not used
  if (passwordReset.used_at !== null) {
    throw new HttpException("Token has already been used", 400);
  }
  // 6. Find member by hrm_member_id
  const member = await MyGlobal.prisma.hrm_members.findUnique({
    where: { id: passwordReset.hrm_member_id },
  });
  // 7. Validate member exists and is not deleted
  if (member === null || member.deleted_at !== null) {
    throw new HttpException("Member account not found", 404);
  }
  // 8. Hash the new password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 9. Update member's password
  await MyGlobal.prisma.hrm_members.update({
    where: { id: member.id },
    data: {
      password_hash: passwordHash,
      updated_at: new Date(),
    },
  });
  // 10. Mark token as used
  await MyGlobal.prisma.hrm_member_password_resets.update({
    where: { id: passwordReset.id },
    data: {
      used_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 11. Return void (204 No Content)
  return;
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
// import { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: IHrmMemberPasswordReset.IRequest;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------