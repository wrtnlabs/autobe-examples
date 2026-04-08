import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
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

export async function patchEcommerceMallAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "created_at_DESC";
  const page = props.body.page ?? 1;
  // Build where clause with proper date range handling
  const whereInput: Prisma.ecommerce_mall_product_snapshotsWhereInput = {
    ecommerce_mall_product_id: props.productId,
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  };
  // Handle cursor-based pagination if provided
  const findManyArgs: Prisma.ecommerce_mall_product_snapshotsFindManyArgs = {
    where: whereInput,
    take: limit,
    orderBy: {
      created_at: sort === "created_at_ASC" ? "asc" : "desc",
    },
    ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
  };
  if (props.body.cursor !== null) {
    findManyArgs.cursor = {
      id: props.body.cursor,
    };
    findManyArgs.skip = 1;
  } else {
    // Offset-based pagination fallback
    findManyArgs.skip = (page - 1) * limit;
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany(findManyArgs),
    MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
      where: whereInput,
    }),
  ]);
  const currentPage = props.body.cursor !== null ? 1 : page;
  return {
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminProductsProductIdSnapshots(props: {
//   admin: AdminPayload;
//   productId: string;
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