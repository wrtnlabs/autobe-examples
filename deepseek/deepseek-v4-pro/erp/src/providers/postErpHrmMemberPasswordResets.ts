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

export async function postErpHrmMemberPasswordResets(props: {
  member: MemberPayload;
  body: IErpHrmMemberPasswordReset.ICreate;
}): Promise<void> {
  const member = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (member === null) {
    return;
  }
  await MyGlobal.prisma.erp_hrm_member_password_resets.deleteMany({
    where: {
      erp_hrm_member_id: member.id,
    },
  });
  await MyGlobal.prisma.erp_hrm_member_password_resets.create({
    data: {
      id: v4(),
      created_at: new Date(),
      expired_at: new Date(Date.now() + 3600000),
      token: v4(),
      updated_at: new Date(),
      member: { connect: { id: member.id } },
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
// export async function postErpHrmMemberPasswordResets(props: {
//   member: MemberPayload;
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