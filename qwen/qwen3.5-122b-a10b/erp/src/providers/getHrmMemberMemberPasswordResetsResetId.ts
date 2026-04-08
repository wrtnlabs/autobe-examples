import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMemberPasswordResetVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordResetVerification";
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

export async function getHrmMemberMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IHrmMemberPasswordResetVerification> {
  // Find the password reset token
  const resetToken =
    await MyGlobal.prisma.hrm_member_password_resets.findUnique({
      where: { id: props.resetId, deleted_at: null },
    });
  if (resetToken === null) {
    throw new HttpException("Token not found", 404);
  }
  // Check if token is expired
  const now = new Date();
  if (resetToken.expires_at < now) {
    throw new HttpException("Token expired", 400);
  }
  // Check if token is already used
  if (resetToken.used_at !== null) {
    throw new HttpException("Token already used", 400);
  }
  // Mark token as used atomically
  await MyGlobal.prisma.hrm_member_password_resets.update({
    where: { id: props.resetId },
    data: { used_at: new Date() },
  });
  // Fetch the associated member's email
  const member = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
    where: { id: resetToken.hrm_member_id },
    select: { email: true },
  });
  // Mask the email: first character + ***@domain
  const atIndex = member.email.indexOf("@");
  if (atIndex <= 0) {
    throw new HttpException("Invalid email format", 500);
  }
  const maskedEmail = `${member.email.substring(0, 1)}***@${member.email.substring(atIndex + 1)}`;
  return {
    email: maskedEmail,
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
// import { IHrmMemberPasswordResetVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordResetVerification";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberMemberPasswordResetsResetId(props: {
//   member: MemberPayload;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IHrmMemberPasswordResetVerification> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------