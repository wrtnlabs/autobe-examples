import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformSellerTransformer } from "../transformers/EcommercePlatformSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformSellersSellerId(props: {
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformSeller> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...EcommercePlatformSellerTransformer.select(),
    });
  return await EcommercePlatformSellerTransformer.transform(record);
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
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformSellersSellerId(props: {
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformSeller> {
//   const record = await MyGlobal.prisma.ecommerce_platform_sellers.findFirstOrThrow({
//     ...EcommercePlatformSellerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------