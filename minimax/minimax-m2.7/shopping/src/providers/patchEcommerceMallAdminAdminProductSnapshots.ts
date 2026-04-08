import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminProductSnapshots(props: {
  admin: AdminPayload;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filter for created_at
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.createdAfter) {
    createdAtFilter.gte = new Date(props.body.createdAfter);
  }
  if (props.body.createdBefore) {
    createdAtFilter.lte = new Date(props.body.createdBefore);
  }
  // Build WHERE clause with optional filters
  const whereInput = {
    ...(props.body.productId && {
      ecommerce_mall_product_id: props.body.productId,
    }),
    ...(props.body.sellerId && {
      ecommerce_mall_seller_id: props.body.sellerId,
    }),
    ...(props.body.categoryName && { category_name: props.body.categoryName }),
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  };
  // Query database for paginated results
  const records =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: whereInput,
  });
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallProductSnapshotAtSummaryTransformer.transform,
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
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminProductSnapshots(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallProductSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
//     ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------