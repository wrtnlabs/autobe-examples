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

export async function postECommerceMallAdministratorSellersSellerIdSuspend(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IECommerceMallSeller.ISuspend;
}): Promise<IECommerceMallSeller> {
  // 1. Verify seller exists (throws 404 if not found)
  await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true },
  });
  // 2. Check if seller is already suspended by examining the latest log entry
  const latestLog =
    await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.findFirst({
      where: { e_commerce_mall_seller_id: props.sellerId },
      orderBy: { created_at: "desc" },
      select: { action: true },
    });
  if (latestLog?.action === "suspend") {
    throw new HttpException(
      "The seller is already suspended. Unsuspend the seller before attempting another suspension.",
      400,
    );
  }
  // 3. Create the immutable suspension audit log entry
  const logId: string & tags.Format<"uuid"> = v4();
  const now = new Date().toISOString();
  await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.create({
    data: {
      id: logId,
      e_commerce_mall_seller_id: props.sellerId,
      action: "suspend",
      reason: props.body.reason ?? null,
      actor_type: "administrator",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Create polymorphic subtype record linking to the acting administrator
  await MyGlobal.prisma.e_commerce_mall_seller_suspension_log_of_administrators.create(
    {
      data: {
        id: v4(),
        seller_suspension_log_id: logId,
        administrator_id: props.administrator.id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );
  // 5. Fetch the seller with full details using transformer and return
  const record = await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow(
    {
      where: { id: props.sellerId },
      ...ECommerceMallSellerTransformer.select(),
    },
  );
  return await ECommerceMallSellerTransformer.transform(record);
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
// export async function postECommerceMallAdministratorSellersSellerIdSuspend(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IECommerceMallSeller.ISuspend;
// }): Promise<IECommerceMallSeller> {
//   const record = await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow({
//     ...ECommerceMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------