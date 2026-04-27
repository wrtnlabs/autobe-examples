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
import { ECommerceMallSellerTransformer } from "../transformers/ECommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSuperAdministratorSellersSellerIdBan(props: {
  superAdministrator: SuperadministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IECommerceMallSeller.IBan;
}): Promise<IECommerceMallSeller> {
  // 1. Verify seller exists and is not soft-deleted
  const seller = await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow(
    {
      where: {
        id: props.sellerId,
        deleted_at: null,
      },
      ...ECommerceMallSellerTransformer.select(),
    },
  );
  // 2. Check if seller is currently banned by examining the latest audit log
  const latestLog =
    await MyGlobal.prisma.e_commerce_mall_super_administrator_audit_logs.findFirst(
      {
        where: {
          target_type: "seller",
          target_id: props.sellerId,
          action: {
            in: ["seller_ban", "seller_unban"],
          },
        },
        orderBy: {
          created_at: "desc",
        },
        select: {
          action: true,
        },
      },
    );
  if (latestLog?.action === "seller_ban") {
    throw new HttpException("Seller is already banned", 409);
  }
  // 3. Record the ban in the super administrator audit log
  await MyGlobal.prisma.e_commerce_mall_super_administrator_audit_logs.create({
    data: {
      id: v4(),
      e_commerce_mall_super_administrator_id: props.superAdministrator.id,
      action: "seller_ban",
      target_type: "seller",
      target_id: props.sellerId,
      reason: props.body.reason,
      created_at: new Date(),
    },
  });
  // 4. Return the seller record via transformer
  return await ECommerceMallSellerTransformer.transform(seller);
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
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSuperAdministratorSellersSellerIdBan(props: {
//   superAdministrator: SuperadministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IECommerceMallSeller.IBan;
// }): Promise<IECommerceMallSeller> {
//   const record = await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow({
//     ...ECommerceMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------