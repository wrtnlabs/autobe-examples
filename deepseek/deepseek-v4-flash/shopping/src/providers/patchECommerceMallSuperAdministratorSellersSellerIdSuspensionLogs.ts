import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerSuspensionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerSuspensionLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSellerSuspensionLogAtSummaryTransformer } from "../transformers/ECommerceMallSellerSuspensionLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSuperAdministratorSellersSellerIdSuspensionLogs(props: {
  superAdministrator: SuperadministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IECommerceMallSellerSuspensionLog.IRequest;
}): Promise<IPageIECommerceMallSellerSuspensionLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    e_commerce_mall_seller_id: props.sellerId,
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.actor_type !== undefined && {
      actor_type: props.body.actor_type,
    }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: props.body.created_at_from,
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: props.body.created_at_to,
        }),
      },
    }),
  } satisfies Prisma.e_commerce_mall_seller_suspension_logsWhereInput;
  const records =
    await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallSellerSuspensionLogAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallSellerSuspensionLogAtSummaryTransformer.transform,
    ),
  };
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
// import { IPageIECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerSuspensionLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSuperAdministratorSellersSellerIdSuspensionLogs(props: {
//   superAdministrator: SuperadministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IECommerceMallSellerSuspensionLog.IRequest;
// }): Promise<IPageIECommerceMallSellerSuspensionLog.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.findMany({
//     ...ECommerceMallSellerSuspensionLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallSellerSuspensionLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------