import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformProductCollector } from "../collectors/MallPlatformProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductTransformer } from "../transformers/MallPlatformProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProducts(props: {
  seller: SellerPayload;
  body: IMallPlatformProduct.ICreate;
}): Promise<IMallPlatformProduct> {
  const created = await MyGlobal.prisma.mall_platform_products.create({
    data: await MallPlatformProductCollector.collect({
      body: props.body,
      seller: props.seller,
    }),
    ...MallPlatformProductTransformer.select(),
  });
  return await MallPlatformProductTransformer.transform(created);
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
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformSellerProducts(props: {
//   seller: SellerPayload;
//   body: IMallPlatformProduct.ICreate;
// }): Promise<IMallPlatformProduct> {
//   const record = await MyGlobal.prisma.mall_platform_products.create({
//     data: await MallPlatformProductCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformProductTransformer.select(),
//   });
//   return await MallPlatformProductTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------