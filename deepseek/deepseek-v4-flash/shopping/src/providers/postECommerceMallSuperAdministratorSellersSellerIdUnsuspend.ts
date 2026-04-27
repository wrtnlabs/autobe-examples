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

export async function postECommerceMallSuperAdministratorSellersSellerIdUnsuspend(props: {
  superAdministrator: SuperadministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IECommerceMallSeller.IUnsuspend;
}): Promise<IECommerceMallSeller> {
  // 1. Verify seller exists and is not soft-deleted
  const seller = await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow(
    {
      where: {
        id: props.sellerId,
        deleted_at: null,
      },
      select: {
        id: true,
        approval_status: true,
      },
    },
  );
  // 2. Verify seller is currently suspended by checking the latest suspension log
  const latestLog =
    await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.findFirst({
      where: { e_commerce_mall_seller_id: props.sellerId },
      orderBy: { created_at: "desc" },
      select: { action: true },
    });
  if (latestLog === null || latestLog.action !== "suspend") {
    throw new HttpException("Seller is not currently suspended", 400);
  }
  // 3. Generate IDs and timestamp as ISO string
  const logId = v4();
  const subtypeId = v4();
  const nowString = new Date().toISOString();
  // 4. Perform all mutations in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Update seller approval status to approved
    await tx.e_commerce_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        approval_status: "approved",
        updated_at: nowString,
      },
    });
    // b. Create suspension log entry
    await tx.e_commerce_mall_seller_suspension_logs.create({
      data: {
        id: logId,
        e_commerce_mall_seller_id: props.sellerId,
        action: "unsuspend",
        reason: props.body.reason ?? null,
        actor_type: "super_administrator",
        created_at: nowString,
        updated_at: nowString,
        deleted_at: null,
      },
    });
    // c. Create super administrator subtype record
    await tx.e_commerce_mall_seller_suspension_log_of_super_administrators.create(
      {
        data: {
          id: subtypeId,
          e_commerce_mall_seller_suspension_log_id: logId,
          e_commerce_mall_super_administrator_id: props.superAdministrator.id,
          deleted_at: null,
          created_at: nowString,
          updated_at: nowString,
        },
      },
    );
  });
  // 5. Return updated seller entity with full details via Transformer
  const updatedSeller =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...ECommerceMallSellerTransformer.select(),
    });
  return await ECommerceMallSellerTransformer.transform(updatedSeller);
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
// export async function postECommerceMallSuperAdministratorSellersSellerIdUnsuspend(props: {
//   superAdministrator: SuperadministratorPayload;
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