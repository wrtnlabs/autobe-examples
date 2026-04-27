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

export async function postECommerceMallAdministratorSellersSellerIdBan(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IECommerceMallSeller.IBan;
}): Promise<IECommerceMallSeller> {
  // 1. Validate seller exists and is not soft-deleted
  await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId, deleted_at: null },
    select: { id: true },
  });
  // 2. Create suspension log entry
  const suspensionLogId = v4();
  await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.create({
    data: {
      id: suspensionLogId,
      e_commerce_mall_seller_id: props.sellerId,
      action: "suspend",
      reason: props.body.reason,
      actor_type: "administrator",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 3. Create administrator subtype record
  await MyGlobal.prisma.e_commerce_mall_seller_suspension_log_of_administrators.create(
    {
      data: {
        id: v4(),
        seller_suspension_log_id: suspensionLogId,
        administrator_id: props.administrator.id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    },
  );
  // 4. Record the ban action in administrator audit log
  await MyGlobal.prisma.e_commerce_mall_administrator_audit_logs.create({
    data: {
      id: v4(),
      administrator: { connect: { id: props.administrator.id } },
      action_type: "ban_seller",
      target_type: "seller",
      target_id: props.sellerId,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.e_commerce_mall_administrator_audit_logsCreateInput,
  });
  // 5. Fetch updated seller with full transformer data
  const updated =
    await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow({
      where: { id: props.sellerId },
      ...ECommerceMallSellerTransformer.select(),
    });
  return await ECommerceMallSellerTransformer.transform(updated);
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
// export async function postECommerceMallAdministratorSellersSellerIdBan(props: {
//   administrator: AdministratorPayload;
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