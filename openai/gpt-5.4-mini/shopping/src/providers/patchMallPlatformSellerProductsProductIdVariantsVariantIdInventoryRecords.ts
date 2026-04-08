import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformInventoryRecordAtSummaryTransformer } from "../transformers/MallPlatformInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IMallPlatformInventoryRecord.IRequest;
}): Promise<IPageIMallPlatformInventoryRecord.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
        deleted_at: true,
      },
    });
  if (product.seller_account_id !== props.seller.id)
    throw new HttpException("Forbidden", 403);
  if (product.deleted_at !== null) throw new HttpException("Not Found", 404);
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        mall_platform_product_id: true,
        deleted_at: true,
      },
    });
  if (variant.mall_platform_product_id !== props.productId)
    throw new HttpException("Not Found", 404);
  if (variant.deleted_at !== null) throw new HttpException("Not Found", 404);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    mall_platform_product_variant_id: props.variantId,
    ...(props.body.createdAtFrom !== undefined
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo !== undefined
      ? { created_at: { lte: props.body.createdAtTo } }
      : {}),
    ...(props.body.reason !== undefined
      ? { reason: { contains: props.body.reason } }
      : {}),
    ...(props.body.quantityChangeDirection === "positive"
      ? { quantity_change: { gt: 0 } }
      : props.body.quantityChangeDirection === "negative"
        ? { quantity_change: { lt: 0 } }
        : {}),
  } satisfies Prisma.mall_platform_inventory_recordsWhereInput;
  const records =
    await MyGlobal.prisma.mall_platform_inventory_records.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        props.body.sort === "oldest"
          ? { created_at: "asc" }
          : { created_at: "desc" },
      ...MallPlatformInventoryRecordAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.mall_platform_inventory_records.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformInventoryRecordAtSummaryTransformer.transform,
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
// import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
// import { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IMallPlatformInventoryRecord.IRequest;
// }): Promise<IPageIMallPlatformInventoryRecord.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_inventory_records.findMany({
//     ...MallPlatformInventoryRecordAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformInventoryRecordAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------