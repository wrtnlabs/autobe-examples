import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmMemberAtSummaryTransformer } from "../transformers/HrmMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberProfilePassword(props: {
  member: MemberPayload;
  body: IHrmMember.IPasswordUpdate;
}): Promise<IHrmMember.ISummary> {
  // Step 1: Find member and verify account is active
  const member = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { id: true, password_hash: true, deleted_at: true },
  });
  // Check if account is deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account is deleted", 410);
  }
  // Step 2: Verify current password
  const isValidCurrentPassword = await PasswordUtil.verify(
    props.body.current_password,
    member.password_hash,
  );
  if (!isValidCurrentPassword) {
    throw new HttpException("Invalid current password", 401);
  }
  // Step 3: Validate new password meets security requirements
  const newPassword = props.body.new_password;
  // Minimum 8 characters
  if (newPassword.length < 8) {
    throw new HttpException("New password must be at least 8 characters", 400);
  }
  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(newPassword)) {
    throw new HttpException(
      "New password must contain at least one uppercase letter",
      400,
    );
  }
  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(newPassword)) {
    throw new HttpException(
      "New password must contain at least one lowercase letter",
      400,
    );
  }
  // Must contain at least one number
  if (!/[0-9]/.test(newPassword)) {
    throw new HttpException(
      "New password must contain at least one number",
      400,
    );
  }
  // Must contain at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    throw new HttpException(
      "New password must contain at least one special character",
      400,
    );
  }
  // Step 4: Ensure new password differs from current password
  if (newPassword === props.body.current_password) {
    throw new HttpException(
      "New password must differ from current password",
      400,
    );
  }
  // Step 5: Hash new password
  const newPasswordHash = await PasswordUtil.hash(newPassword);
  // Step 6: Update password_hash and updated_at
  await MyGlobal.prisma.hrm_members.update({
    where: { id: props.member.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
  // Step 7: Invalidate all existing sessions
  await MyGlobal.prisma.hrm_member_sessions.deleteMany({
    where: { hrm_member_id: props.member.id },
  });
  // Step 8: Fetch and transform updated member
  const updated = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...HrmMemberAtSummaryTransformer.select(),
  });
  return await HrmMemberAtSummaryTransformer.transform(updated);
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
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberProfilePassword(props: {
//   member: MemberPayload;
//   body: IHrmMember.IPasswordUpdate;
// }): Promise<IHrmMember.ISummary> {
//   await MyGlobal.prisma.hrm_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
//     where: { ... },
//     ...HrmMemberAtSummaryTransformer.select(),
//   });
//   return await HrmMemberAtSummaryTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------