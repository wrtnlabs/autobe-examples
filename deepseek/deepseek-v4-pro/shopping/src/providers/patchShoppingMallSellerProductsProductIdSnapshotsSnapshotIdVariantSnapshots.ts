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

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdVariantSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: { shopping_mall_product_id: true },
    });
  if (productSnapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Snapshot does not belong to the specified product",
      404,
    );
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_product_variant_snapshotsWhereInput = {
    shopping_mall_product_snapshot_id: props.snapshotId,
  };
  if (props.body.search) {
    whereInput.OR = [
      { sku_code: { contains: props.body.search, mode: "insensitive" } },
      { option_values: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.created_at_from || props.body.created_at_to) {
    whereInput.created_at = {};
    if (props.body.created_at_from) {
      whereInput.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      whereInput.created_at.lte = props.body.created_at_to;
    }
  }
  if (props.body.sku_code) {
    whereInput.sku_code = {
      contains: props.body.sku_code,
      mode: "insensitive",
    };
  }
  if (props.body.option_values) {
    whereInput.option_values = {
      contains: props.body.option_values,
      mode: "insensitive",
    };
  }
  if (
    props.body.price_min !== undefined ||
    props.body.price_max !== undefined
  ) {
    whereInput.price = { not: null };
    if (props.body.price_min !== undefined) {
      whereInput.price.gte = props.body.price_min;
    }
    if (props.body.price_max !== undefined) {
      whereInput.price.lte = props.body.price_max;
    }
  }
  if (
    props.body.stock_quantity_min !== undefined ||
    props.body.stock_quantity_max !== undefined
  ) {
    whereInput.stock_quantity = {};
    if (props.body.stock_quantity_min !== undefined) {
      whereInput.stock_quantity.gte = props.body.stock_quantity_min;
    }
    if (props.body.stock_quantity_max !== undefined) {
      whereInput.stock_quantity.lte = props.body.stock_quantity_max;
    }
  }
  if (props.body.has_parent_snapshot !== undefined) {
    if (props.body.has_parent_snapshot) {
      whereInput.shopping_mall_product_snapshot_id = { not: null };
    } else {
      whereInput.shopping_mall_product_snapshot_id = null;
    }
  }
  const data =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductVariantSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: whereInput,
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
// export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdVariantSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
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