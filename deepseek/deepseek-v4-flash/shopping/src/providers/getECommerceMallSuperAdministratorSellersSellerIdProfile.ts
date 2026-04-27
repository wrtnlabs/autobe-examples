import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSellerProfileTransformer } from "../transformers/ECommerceMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallSuperAdministratorSellersSellerIdProfile(props: {
  superAdministrator: SuperadministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallSellerProfile> {
  const seller =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      select: { id: true, deleted_at: true },
    });
  if (seller.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const profile =
    await MyGlobal.prisma.e_commerce_mall_seller_profiles.findFirstOrThrow({
      ...ECommerceMallSellerProfileTransformer.select(),
      where: { e_commerce_mall_seller_id: props.sellerId },
    });
  if (profile.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await ECommerceMallSellerProfileTransformer.transform(profile);
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
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSuperAdministratorSellersSellerIdProfile(props: {
//   superAdministrator: SuperadministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallSellerProfile> {
//   const record = await MyGlobal.prisma.e_commerce_mall_seller_profiles.findFirstOrThrow({
//     ...ECommerceMallSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------