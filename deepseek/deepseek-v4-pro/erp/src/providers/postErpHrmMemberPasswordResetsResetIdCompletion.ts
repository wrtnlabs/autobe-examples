import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
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

export async function postErpHrmMemberPasswordResetsResetIdCompletion(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
  body: IErpHrmMemberPasswordReset.ICompletion;
}): Promise<void> {
  // Step 1: Look up the password reset record by resetId
  const resetRecord =
    await MyGlobal.prisma.erp_hrm_member_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
      select: {
        id: true,
        erp_hrm_member_id: true,
        token: true,
        expired_at: true,
      },
    });
  // Step 2: Check if the reset token has expired
  const now = new Date();
  if (resetRecord.expired_at < now) {
    throw new HttpException(
      "Password reset token has expired. Please request a new one.",
      400,
    );
  }
  // Step 3: Compare the provided token against the stored token
  if (resetRecord.token !== props.body.token) {
    throw new HttpException("Invalid reset token.", 400);
  }
  // Step 4: Fetch the target member's current password hash for comparison
  const targetMember = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: resetRecord.erp_hrm_member_id },
    select: { id: true, password_hash: true },
  });
  // New password must not be the same as the current password
  const isSameAsCurrent = await PasswordUtil.verify(
    props.body.password,
    targetMember.password_hash,
  );
  if (isSameAsCurrent) {
    throw new HttpException(
      "New password must be different from the current password.",
      400,
    );
  }
  // Step 5: Hash the new password and update the member record
  const newPasswordHash = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: resetRecord.erp_hrm_member_id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
  // Step 6: Hard delete the password reset record to prevent token reuse
  await MyGlobal.prisma.erp_hrm_member_password_resets.delete({
    where: { id: props.resetId },
  });
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
// import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberPasswordResetsResetIdCompletion(props: {
//   member: MemberPayload;
//   resetId: string & tags.Format<"uuid">;
//   body: IErpHrmMemberPasswordReset.ICompletion;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------