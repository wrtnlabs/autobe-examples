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
  // Verify product exists and check ownership
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { ecommerce_mall_seller_id: true },
    });
  // Authorization: seller must own the product OR be admin
  if (
    props.seller.type !== "admin" &&
    product.ecommerce_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException(
      "You don't have permission to view snapshots of this product",
      403,
    );
  }
  // Build where clause with optional date range criteria
  const whereInput = {
    product_id: props.productId,
    ...(props.body.createdAtFrom !== null && {
      created_at: { gte: props.body.createdAtFrom },
    }),
  } satisfies Prisma.ecommerce_mall_product_snapshotsWhereInput;
  // Add end date filter if provided
  if (props.body.createdAtTo !== null) {
    whereInput.created_at = {
      ...whereInput.created_at,
      lte: props.body.createdAtTo,
    };
  }
  // Pagination parameters
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Sort order (default newest first)
  const orderByInput = (
    props.body.sort === "created_at_ASC"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_product_snapshotsOrderByWithRelationInput;
  // Query snapshots with pagination
  const records =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: whereInput,
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
// export async function patchEcommerceMallSellerProductsProductIdSnapshots(props: {
//   seller: SellerPayload;
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