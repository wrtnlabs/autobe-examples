import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerAtRejectionReasonTransformer } from "../transformers/EcommerceMallSellerAtRejectionReasonTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellerRejectionReason(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallSeller.IRejectionReason> {
  const record = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.seller.id },
      ...EcommerceMallSellerAtRejectionReasonTransformer.select(),
    },
  );
  return await EcommerceMallSellerAtRejectionReasonTransformer.transform(
    record,
  );
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerSellerRejectionReason(props: {
//   seller: SellerPayload;
// }): Promise<IEcommerceMallSeller.IRejectionReason> {
//   const record = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
//     ...EcommerceMallSellerAtRejectionReasonTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerAtRejectionReasonTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------