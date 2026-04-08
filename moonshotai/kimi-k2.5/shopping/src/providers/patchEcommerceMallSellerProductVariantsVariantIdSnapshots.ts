import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify variant exists and belongs to the seller
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause with date filters
  const whereInput: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput =
    {
      product_variant_id: props.variantId,
      ...(props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined
        ? {
            created_at: {
              ...(props.body.createdAtFrom !== undefined && {
                gte: new Date(props.body.createdAtFrom),
              }),
              ...(props.body.createdAtTo !== undefined && {
                lte: new Date(props.body.createdAtTo),
              }),
            },
          }
        : {}),
    };
  // Fetch snapshots ordered by creation time (newest first)
  const records =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
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
      EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform,
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
// import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
// import { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductVariantsVariantIdSnapshots(props: {
//   seller: SellerPayload;
//   variantId: string;
//   body: IEcommerceMallProductVariantSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
//     ...EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------