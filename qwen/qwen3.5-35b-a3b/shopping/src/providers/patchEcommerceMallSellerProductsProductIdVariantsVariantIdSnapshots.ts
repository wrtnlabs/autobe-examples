import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
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

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortedPage = Math.max(1, page);
  const sortedLimit = Math.min(100, Math.max(1, limit));
  const skip = (sortedPage - 1) * sortedLimit;
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId, deleted_at: null },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, product_id: true },
    });
  if (variant.product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const sort = props.body.sort ?? "created_at_desc";
  const orderBy =
    sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const whereInput: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput =
    {
      product_id: props.productId,
      product_variant_id: props.variantId,
      ...(props.body.createdAtFrom && {
        created_at: { gte: new Date(props.body.createdAtFrom) },
      }),
      ...(props.body.createdAtTo && {
        created_at: { lte: new Date(props.body.createdAtTo) },
      }),
      ...(props.body.skuSearch && {
        sku_code: { contains: props.body.skuSearch, mode: "insensitive" },
      }),
      ...(props.body.priceRange?.min !== undefined ||
      props.body.priceRange?.max !== undefined
        ? {
            price: {
              ...(props.body.priceRange?.min !== undefined && {
                gte: props.body.priceRange.min,
              }),
              ...(props.body.priceRange?.max !== undefined && {
                lte: props.body.priceRange.max,
              }),
            },
          }
        : undefined),
    };
  const records =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: sortedLimit,
      orderBy,
      ...EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: sortedPage,
      limit: sortedLimit,
      records: total,
      pages: Math.ceil(total / sortedLimit),
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
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