import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdVariantsVariantCodeSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantCode: string;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        code: props.variantCode,
        shopping_mall_product_id: props.productId,
      },
      select: { id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const conditions: Prisma.shopping_mall_product_variant_snapshotsWhereInput[] =
    [];
  if (props.body.search) {
    conditions.push({
      OR: [
        { sku_code: { contains: props.body.search, mode: "insensitive" } },
        { option_values: { contains: props.body.search, mode: "insensitive" } },
      ],
    });
  }
  if (props.body.created_at_from) {
    conditions.push({ created_at: { gte: props.body.created_at_from } });
  }
  if (props.body.created_at_to) {
    conditions.push({ created_at: { lte: props.body.created_at_to } });
  }
  if (props.body.has_parent_snapshot === true) {
    conditions.push({ shopping_mall_product_snapshot_id: { not: null } });
  } else if (props.body.has_parent_snapshot === false) {
    conditions.push({ shopping_mall_product_snapshot_id: null });
  }
  if (props.body.sku_code) {
    conditions.push({
      sku_code: { contains: props.body.sku_code, mode: "insensitive" },
    });
  }
  if (props.body.option_values) {
    conditions.push({
      option_values: {
        contains: props.body.option_values,
        mode: "insensitive",
      },
    });
  }
  if (
    props.body.price_min !== undefined ||
    props.body.price_max !== undefined
  ) {
    conditions.push({ price: { not: null } });
  }
  if (props.body.price_min !== undefined) {
    conditions.push({ price: { gte: props.body.price_min } });
  }
  if (props.body.price_max !== undefined) {
    conditions.push({ price: { lte: props.body.price_max } });
  }
  if (props.body.stock_quantity_min !== undefined) {
    conditions.push({ stock_quantity: { gte: props.body.stock_quantity_min } });
  }
  if (props.body.stock_quantity_max !== undefined) {
    conditions.push({ stock_quantity: { lte: props.body.stock_quantity_max } });
  }
  const where: Prisma.shopping_mall_product_variant_snapshotsWhereInput = {
    shopping_mall_product_variant_id: variant.id,
    ...(conditions.length > 0 && { AND: conditions }),
  };
  const data =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductVariantSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductVariantSnapshotAtSummaryTransformer.transform,
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
// import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
// import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerProductsProductIdVariantsVariantCodeSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantCode: string;
//   body: IShoppingMallProductVariantSnapshot.IRequest;
// }): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
//     ...ShoppingMallProductVariantSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallProductVariantSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------