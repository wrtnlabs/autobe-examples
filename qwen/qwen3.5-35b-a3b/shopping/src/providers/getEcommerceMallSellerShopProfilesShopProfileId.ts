import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShopProfileTransformer } from "../transformers/EcommerceMallShopProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerShopProfilesShopProfileId(props: {
  seller: SellerPayload;
  shopProfileId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShopProfile> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.findUniqueOrThrow({
      ...EcommerceMallShopProfileTransformer.select(),
      where: {
        id: props.shopProfileId,
        seller_id: props.seller.id,
      },
    });
  return await EcommerceMallShopProfileTransformer.transform(record);
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
// import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerShopProfilesShopProfileId(props: {
//   seller: SellerPayload;
//   shopProfileId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShopProfile> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shop_profiles.findFirstOrThrow({
//     ...EcommerceMallShopProfileTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShopProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------