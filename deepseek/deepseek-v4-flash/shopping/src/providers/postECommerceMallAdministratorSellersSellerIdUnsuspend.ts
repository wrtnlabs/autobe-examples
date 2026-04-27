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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallSellerTransformer } from "../transformers/ECommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAdministratorSellersSellerIdUnsuspend(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IECommerceMallSeller.IUnsuspend;
}): Promise<IECommerceMallSeller> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const seller = await tx.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      select: {
        id: true,
        approval_status: true,
        deleted_at: true,
      },
    });
    if (seller.deleted_at !== null) {
      throw new HttpException("Seller account has been deleted", 400);
    }
    if (seller.approval_status !== "suspended") {
      throw new HttpException("Seller is not currently suspended", 400);
    }
    const now: string & tags.Format<"date-time"> = new Date().toISOString();
    await tx.e_commerce_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        approval_status: "approved",
        updated_at: now,
      },
    });
    const logId: string & tags.Format<"uuid"> = v4();
    await tx.e_commerce_mall_seller_suspension_logs.create({
      data: {
        id: logId,
        e_commerce_mall_seller_id: props.sellerId,
        action: "unsuspend",
        reason: props.body.reason ?? null,
        actor_type: "administrator",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const subtypeId: string & tags.Format<"uuid"> = v4();
    await tx.e_commerce_mall_seller_suspension_log_of_administrators.create({
      data: {
        id: subtypeId,
        seller_suspension_log_id: logId,
        administrator_id: props.administrator.id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const updatedSeller = await tx.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...ECommerceMallSellerTransformer.select(),
    });
    return await ECommerceMallSellerTransformer.transform(updatedSeller);
  });
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
// export async function postECommerceMallAdministratorSellersSellerIdUnsuspend(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IECommerceMallSeller.IUnsuspend;
// }): Promise<IECommerceMallSeller> {
//   const record = await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow({
//     ...ECommerceMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------