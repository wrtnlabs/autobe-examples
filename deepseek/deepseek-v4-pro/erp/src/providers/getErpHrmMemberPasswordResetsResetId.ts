import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberPasswordResetTransformer } from "../transformers/ErpHrmMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmMemberPasswordReset> {
  const record =
    await MyGlobal.prisma.erp_hrm_member_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
      ...ErpHrmMemberPasswordResetTransformer.select(),
    });
  return await ErpHrmMemberPasswordResetTransformer.transform(record);
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberPasswordResetsResetId(props: {
//   member: MemberPayload;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmMemberPasswordReset> {
//   const record = await MyGlobal.prisma.erp_hrm_member_password_resets.findFirstOrThrow({
//     ...ErpHrmMemberPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmMemberPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------