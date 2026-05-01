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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductVariantSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProductsProductIdSnapshotsSnapshotIdVariantSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  if (props.body.has_parent_snapshot === false) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const whereInput: Prisma.shopping_mall_product_variant_snapshotsWhereInput = {
    shopping_mall_product_snapshot_id: props.snapshotId,
    ...(props.body.search
      ? {
          OR: [
            { sku_code: { contains: props.body.search, mode: "insensitive" } },
            {
              option_values: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from
              ? { gte: props.body.created_at_from }
              : {}),
            ...(props.body.created_at_to
              ? { lte: props.body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.sku_code
      ? { sku_code: { contains: props.body.sku_code, mode: "insensitive" } }
      : {}),
    ...(props.body.option_values
      ? {
          option_values: {
            contains: props.body.option_values,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.price_min !== undefined || props.body.price_max !== undefined
      ? {
          price: {
            not: null,
            ...(props.body.price_min !== undefined
              ? { gte: props.body.price_min }
              : {}),
            ...(props.body.price_max !== undefined
              ? { lte: props.body.price_max }
              : {}),
          },
        }
      : {}),
    ...(props.body.stock_quantity_min !== undefined ||
    props.body.stock_quantity_max !== undefined
      ? {
          stock_quantity: {
            ...(props.body.stock_quantity_min !== undefined
              ? { gte: props.body.stock_quantity_min }
              : {}),
            ...(props.body.stock_quantity_max !== undefined
              ? { lte: props.body.stock_quantity_max }
              : {}),
          },
        }
      : {}),
  };
  const records =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: whereInput,
      ...ShoppingMallProductVariantSnapshotAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
      records,
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
// export async function patchShoppingMallAdminProductsProductIdSnapshotsSnapshotIdVariantSnapshots(props: {
//   admin: AdminPayload;
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