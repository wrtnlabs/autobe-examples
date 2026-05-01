import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmGuestPasswordResetsResetIdCompletion(props: {
  guest: GuestPayload;
  resetId: string & tags.Format<"uuid">;
  body: IErpHrmMemberPasswordReset.ICompletion;
}): Promise<void> {
  const resetRecord =
    await MyGlobal.prisma.erp_hrm_member_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
    });
  if (resetRecord.expired_at < new Date()) {
    throw new HttpException(
      "The password reset request has expired. Please request a new password reset.",
      400,
    );
  }
  if (resetRecord.token !== props.body.token) {
    throw new HttpException("Invalid reset token.", 400);
  }
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: resetRecord.erp_hrm_member_id },
  });
  const isSamePassword = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (isSamePassword) {
    throw new HttpException(
      "New password must not be the same as the current password.",
      400,
    );
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: resetRecord.erp_hrm_member_id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
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
// export async function postErpHrmGuestPasswordResetsResetIdCompletion(props: {
//   guest: GuestPayload;
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