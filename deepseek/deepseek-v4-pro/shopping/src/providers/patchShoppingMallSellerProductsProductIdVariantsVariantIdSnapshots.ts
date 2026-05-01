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

export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (variant.product.id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      404,
    );
  }
  if (variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(props.body.search !== undefined && {
      OR: [
        {
          sku_code: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          option_values: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: props.body.created_at_to },
    }),
    ...(props.body.has_parent_snapshot !== undefined && {
      shopping_mall_product_snapshot_id: props.body.has_parent_snapshot
        ? { not: null }
        : null,
    }),
    ...(props.body.sku_code !== undefined && {
      sku_code: { contains: props.body.sku_code, mode: "insensitive" as const },
    }),
    ...(props.body.option_values !== undefined && {
      option_values: {
        contains: props.body.option_values,
        mode: "insensitive" as const,
      },
    }),
    ...((props.body.price_min !== undefined ||
      props.body.price_max !== undefined) && {
      price: {
        not: null,
        ...(props.body.price_min !== undefined && {
          gte: props.body.price_min,
        }),
        ...(props.body.price_max !== undefined && {
          lte: props.body.price_max,
        }),
      },
    }),
    ...(props.body.stock_quantity_min !== undefined && {
      stock_quantity: { gte: props.body.stock_quantity_min },
    }),
    ...(props.body.stock_quantity_max !== undefined && {
      stock_quantity: { lte: props.body.stock_quantity_max },
    }),
  } satisfies Prisma.shopping_mall_product_variant_snapshotsWhereInput;
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
// export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
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