import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmMemberPasswordResetCollector } from "../collectors/HrmMemberPasswordResetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberMemberPasswordResets(props: {
  member: MemberPayload;
  body: IHrmMemberPasswordReset.ICreate;
}): Promise<void> {
  await MyGlobal.prisma.hrm_member_password_resets.create({
    data: await HrmMemberPasswordResetCollector.collect({
      body: props.body,
    }),
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
// import { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: IHrmMemberPasswordReset.ICreate;
// }): Promise<void> {
//   await MyGlobal.prisma.hrm_member_password_resets.create({
//     data: await HrmMemberPasswordResetCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------