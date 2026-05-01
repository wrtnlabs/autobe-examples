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
import { ErpHrmMemberTransformer } from "../transformers/ErpHrmMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProfile(props: {
  member: MemberPayload;
  body: IErpHrmMember.IUpdate;
}): Promise<IErpHrmMember> {
  await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: props.member.id },
    data: {
      updated_at: new Date().toISOString(),
      ...(props.body.display_name !== undefined
        ? { display_name: props.body.display_name }
        : {}),
      ...("avatar_image" in props.body
        ? { avatar_image: props.body.avatar_image }
        : {}),
      ...("phone_number" in props.body
        ? { phone_number: props.body.phone_number }
        : {}),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...ErpHrmMemberTransformer.select(),
  });
  return await ErpHrmMemberTransformer.transform(updated);
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
// export async function putErpHrmMemberProfile(props: {
//   member: MemberPayload;
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