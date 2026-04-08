import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerSessionTransformer } from "../transformers/EcommerceMallSellerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceMallAdministratorSellersSellerIdSessionsSessionId(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerSession> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirstOrThrow({
      ...EcommerceMallSellerSessionTransformer.select(),
      where: {
        id: props.sessionId,
        ecommerce_mall_seller_id: props.sellerId,
        deleted_at: null,
      },
    });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdministratorSellersSellerIdSessionsSessionId(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerSession> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirstOrThrow({
//     ...EcommerceMallSellerSessionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------