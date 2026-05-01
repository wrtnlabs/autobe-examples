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

export async function postErpHrmGuestPasswordResets(props: {
  guest: GuestPayload;
  body: IErpHrmMemberPasswordReset.ICreate;
}): Promise<void> {
  const member = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (member === null) {
    return;
  }
  const now = new Date();
  await MyGlobal.prisma.erp_hrm_member_password_resets.deleteMany({
    where: {
      erp_hrm_member_id: member.id,
      expired_at: { gt: now },
    },
  });
  await MyGlobal.prisma.erp_hrm_member_password_resets.create({
    data: {
      id: v4(),
      member: { connect: { id: member.id } },
      token: v4(),
      created_at: now,
      updated_at: now,
      expired_at: new Date(now.getTime() + 3600000),
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
// import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmGuestPasswordResets(props: {
//   guest: GuestPayload;
//   body: IErpHrmMemberPasswordReset.ICreate;
// }): Promise<void> {
//   await MyGlobal.prisma.erp_hrm_member_password_resets.create({
//     data: await ErpHrmMemberPasswordResetCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------