import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerSessionTransformer } from "../transformers/EcommerceMallSellerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSessionsSessionId(props: {
  seller: SellerPayload;
  sessionId: string;
}): Promise<IEcommerceMallSellerSession> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findUniqueOrThrow({
      ...EcommerceMallSellerSessionTransformer.select(),
      where: { id: props.sessionId },
    });
  if (record.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSellerSessionTransformer.transform(record);
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
// import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerSessionsSessionId(props: {
//   seller: SellerPayload;
//   sessionId: string;
// }): Promise<IEcommerceMallSellerSession> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirstOrThrow({
//     ...EcommerceMallSellerSessionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------