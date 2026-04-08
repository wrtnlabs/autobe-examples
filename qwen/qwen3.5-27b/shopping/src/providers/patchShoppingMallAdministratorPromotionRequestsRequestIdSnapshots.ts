import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPromotionRequestSnapshot";
import { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorPromotionRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorPromotionRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorPromotionRequestsRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorPromotionRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallAdministratorPromotionRequestSnapshot.ISummary> {
  // Verify the promotion request exists
  await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.findUniqueOrThrow(
    {
      where: { id: props.requestId },
    },
  );
  // Build where clause with filters
  const whereInput: Prisma.shopping_mall_administrator_promotion_request_snapshotsWhereInput =
    {
      shopping_mall_administrator_promotion_request_id: props.requestId,
    };
  // Apply status filter if provided
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Apply date range filters if provided
  if (props.body.dateFrom !== undefined || props.body.dateTo !== undefined) {
    whereInput.created_at = {};
    if (props.body.dateFrom !== undefined) {
      whereInput.created_at.gte = new Date(props.body.dateFrom);
    }
    if (props.body.dateTo !== undefined) {
      whereInput.created_at.lte = new Date(props.body.dateTo);
    }
  }
  // Apply search filter if provided (case-insensitive LIKE on reason)
  if (props.body.search !== undefined) {
    whereInput.reason = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Handle pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Fetch snapshots with transformer select
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_promotion_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...ShoppingMallAdministratorPromotionRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count total records for pagination
  const total =
    await MyGlobal.prisma.shopping_mall_administrator_promotion_request_snapshots.count(
      {
        where: whereInput,
      },
    );
  // Transform records
  const transformedData = await ArrayUtil.asyncMap(
    records,
    ShoppingMallAdministratorPromotionRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
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
// import { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
// import { IPageIShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPromotionRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdministratorPromotionRequestsRequestIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IShoppingMallAdministratorPromotionRequestSnapshot.IRequest;
// }): Promise<IPageIShoppingMallAdministratorPromotionRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_administrator_promotion_request_snapshots.findMany({
//     ...ShoppingMallAdministratorPromotionRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdministratorPromotionRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------