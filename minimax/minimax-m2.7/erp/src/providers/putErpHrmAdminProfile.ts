import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmMemberTransformer } from "../transformers/ErpHrmMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminProfile(props: {
  admin: AdminPayload;
  body: IErpHrmMember.IUpdate;
}): Promise<IErpHrmMember> {
  const data: Prisma.erp_hrm_membersUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.display_name !== undefined) {
    data.display_name = props.body.display_name;
  }
  if (props.body.avatar_uri !== undefined) {
    data.avatar_uri = props.body.avatar_uri;
  }
  if (props.body.phone !== undefined) {
    data.phone = props.body.phone;
  }
  if (props.body.password !== undefined) {
    data.password_hash = await PasswordUtil.hash(props.body.password);
  }
  await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: props.admin.id },
    data,
  });
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: props.admin.id },
    ...ErpHrmMemberTransformer.select(),
  });
  return await ErpHrmMemberTransformer.transform(member);
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
// export async function putErpHrmAdminProfile(props: {
//   admin: AdminPayload;
//   body: IErpHrmMember.IUpdate;
// }): Promise<IErpHrmMember> {
//   await MyGlobal.prisma.erp_hrm_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmMemberTransformer.select(),
//   });
//   return await ErpHrmMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------