import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallUserBanOfSellerTransformer } from "../transformers/EcommerceMallUserBanOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdministratorUserBanOfSellersBanOfSellerId(props: {
  superAdministrator: SuperadministratorPayload;
  banOfSellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallUserBanOfSeller> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.findUniqueOrThrow({
      ...EcommerceMallUserBanOfSellerTransformer.select(),
      where: {
        id: props.banOfSellerId,
        deleted_at: null,
      },
    });
  return await EcommerceMallUserBanOfSellerTransformer.transform(record);
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
// import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdministratorUserBanOfSellersBanOfSellerId(props: {
//   superAdministrator: SuperadministratorPayload;
//   banOfSellerId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallUserBanOfSeller> {
//   const record = await MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.findFirstOrThrow({
//     ...EcommerceMallUserBanOfSellerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallUserBanOfSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------