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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  // Validate product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Build WHERE clause with filters (entity_status is computed, not a DB field)
  const whereInput: Prisma.ecommerce_mall_product_snapshotsWhereInput = {
    ecommerce_mall_product_id: props.productId,
    ...(props.body.start_date && {
      created_at: { gte: props.body.start_date },
    }),
    ...(props.body.end_date && {
      created_at: { lte: props.body.end_date },
    }),
  } satisfies Prisma.ecommerce_mall_product_snapshotsWhereInput;
  // Determine sort order (entity_status cannot be sorted as it's computed)
  // Prisma SortOrder uses lowercase: "asc" | "desc"
  const orderByInput = (props.body.sort_direction ?? "desc") as "asc" | "desc";
  const orderBy = [
    {
      created_at: orderByInput,
    },
  ] satisfies Prisma.ecommerce_mall_product_snapshotsOrderByWithRelationInput[];
  // Pagination parameters
  const page = (props.body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = Math.min((props.body.limit ?? 50) as number, 200) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;
  const skip = (page - 1) * limit;
  // Offset pagination (not cursor-based to avoid Prisma cursor type incompatibility)
  const data = await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
    where: whereInput,
    orderBy,
    skip,
    take: limit + 1, // Fetch one extra to check if there's more
    ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
  });
  // Check if there are more records
  const hasMore = data.length > limit;
  const actualData = hasMore ? data.slice(0, limit) : data;
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    actualData,
    EcommerceMallProductSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductsProductIdSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
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