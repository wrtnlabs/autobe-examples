import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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

export async function postErpHrmMemberPasswordsChange(props: {
  member: MemberPayload;
  body: IErpHrmMember.IChangePassword;
}): Promise<void> {
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
  });
  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.currentPassword,
    member.password_hash,
  );
  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 403);
  }
  if (props.body.currentPassword === props.body.newPassword) {
    throw new HttpException(
      "New password must differ from the current password",
      422,
    );
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.newPassword);
  await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: props.member.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date().toISOString(),
    },
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberPasswordsChange(props: {
//   member: MemberPayload;
//   body: IErpHrmMember.IChangePassword;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------