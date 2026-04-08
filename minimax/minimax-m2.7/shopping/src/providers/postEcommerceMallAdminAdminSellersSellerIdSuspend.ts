import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerSuspensionCollector } from "../collectors/EcommerceMallSellerSuspensionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionTransformer } from "../transformers/EcommerceMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminSellersSellerIdSuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerSuspension.ICreate;
}): Promise<IEcommerceMallSellerSuspension> {
  // 1. Verify seller exists
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: { id: true },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  // 2. Check for existing active suspension
  const existingSuspension =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findFirst({
      where: {
        ecommerce_mall_seller_id: props.sellerId,
        restored_at: null,
      },
      select: { id: true },
    });
  if (existingSuspension !== null) {
    throw new HttpException("Seller is already suspended", 400);
  }
  // 3. Create suspension record using Collector
  const record = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.create(
    {
      data: await EcommerceMallSellerSuspensionCollector.collect({
        body: props.body,
        ecommerceMallSellers: { id: props.sellerId },
        ecommerceMallAdmins: { id: props.admin.id },
      }),
      ...EcommerceMallSellerSuspensionTransformer.select(),
    },
  );
  // 4. Return transformed response
  return await EcommerceMallSellerSuspensionTransformer.transform(record);
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
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdminAdminSellersSellerIdSuspend(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSellerSuspension.ICreate;
// }): Promise<IEcommerceMallSellerSuspension> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.create({
//     data: await EcommerceMallSellerSuspensionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallSellerSuspensionTransformer.select(),
//   });
//   return await EcommerceMallSellerSuspensionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------