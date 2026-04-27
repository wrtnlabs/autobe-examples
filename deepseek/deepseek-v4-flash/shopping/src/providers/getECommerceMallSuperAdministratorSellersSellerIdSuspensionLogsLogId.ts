import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerSuspensionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSellerSuspensionLogTransformer } from "../transformers/ECommerceMallSellerSuspensionLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getECommerceMallSuperAdministratorSellersSellerIdSuspensionLogsLogId(props: {
  superAdministrator: SuperadministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallSellerSuspensionLog> {
  // Step 1: Validate the seller exists — findUniqueOrThrow returns 404 if not found
  await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true },
  });
  // Step 2: Query the suspension log by logId filtered by sellerId
  // findFirstOrThrow returns 404 if the log doesn't exist or doesn't belong to this seller
  const record =
    await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.findFirstOrThrow(
      {
        where: {
          id: props.logId,
          e_commerce_mall_seller_id: props.sellerId,
        },
        ...ECommerceMallSellerSuspensionLogTransformer.select(),
      },
    );
  // Step 3: Transform and return the response
  return await ECommerceMallSellerSuspensionLogTransformer.transform(record);
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
// import { IECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerSuspensionLog";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSuperAdministratorSellersSellerIdSuspensionLogsLogId(props: {
//   superAdministrator: SuperadministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   logId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallSellerSuspensionLog> {
//   const record = await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.findFirstOrThrow({
//     ...ECommerceMallSellerSuspensionLogTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSellerSuspensionLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------