import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallMemberTransformer } from "../transformers/EcommerceMallMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallMember> {
  const record = await MyGlobal.prisma.ecommerce_mall_members.findFirstOrThrow({
    ...EcommerceMallMemberTransformer.select(),
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  return await EcommerceMallMemberTransformer.transform(record);
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
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMembersMemberId(props: {
//   memberId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallMember> {
//   const record = await MyGlobal.prisma.ecommerce_mall_members.findFirstOrThrow({
//     ...EcommerceMallMemberTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------