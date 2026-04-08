import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformCustomerTransformer } from "../transformers/MallPlatformCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerAccount(props: {
  seller: SellerPayload;
}): Promise<IMallPlatformCustomer> {
  const record =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      ...MallPlatformCustomerTransformer.select(),
      where: {
        id: props.seller.id,
      },
    });
  if (record.deleted_at !== null || record.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  return await MallPlatformCustomerTransformer.transform(record);
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
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerAccount(props: {
//   seller: SellerPayload;
// }): Promise<IMallPlatformCustomer> {
//   const record = await MyGlobal.prisma.mall_platform_customers.findFirstOrThrow({
//     ...MallPlatformCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------