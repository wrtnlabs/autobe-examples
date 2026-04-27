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

export async function postECommerceMallSuperAdministratorSellersSellerIdSuspend(props: {
  superAdministrator: SuperadministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IECommerceMallSeller.ISuspend;
}): Promise<IECommerceMallSeller> {
  // Verify seller exists and is not deleted
  await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow({
    where: { id: props.sellerId, deleted_at: null },
    select: { id: true },
  });
  // Check if seller is already suspended:
  // Find the most recent suspension log entry for this seller
  const latestLog =
    await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.findFirst({
      where: { e_commerce_mall_seller_id: props.sellerId },
      orderBy: { created_at: "desc" },
      select: { action: true },
    });
  // If the latest action is "suspend", the seller is already suspended
  if (latestLog?.action === "suspend") {
    throw new HttpException("Seller is already suspended", 409);
  }
  // Create the suspension log entry
  const now = new Date().toISOString();
  const logId = v4();
  await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.create({
    data: {
      id: logId,
      e_commerce_mall_seller_id: props.sellerId,
      action: "suspend",
      reason: props.body.reason ?? null,
      actor_type: "super_administrator",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create the subtype record linking the suspension log to the acting super administrator
  await MyGlobal.prisma.e_commerce_mall_seller_suspension_log_of_super_administrators.create(
    {
      data: {
        id: v4(),
        e_commerce_mall_seller_suspension_log_id: logId,
        e_commerce_mall_super_administrator_id: props.superAdministrator.id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );
  // Read and return the seller entity using the transformer
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
// export async function postECommerceMallSuperAdministratorSellersSellerIdSuspend(props: {
//   superAdministrator: SuperadministratorPayload;
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