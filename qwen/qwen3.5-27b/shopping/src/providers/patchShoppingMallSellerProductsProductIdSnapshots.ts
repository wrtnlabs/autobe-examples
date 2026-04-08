import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  // Verify product exists and belongs to seller
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
    },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.shopping_mall_product_snapshotsWhereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.dateFrom && {
      created_at: {
        gte: new Date(props.body.dateFrom),
      },
    }),
    ...(props.body.dateTo && {
      created_at: {
        lte: new Date(props.body.dateTo),
      },
    }),
  };
  // Add changedField filter
  if (props.body.changedField) {
    const orConditions: Prisma.shopping_mall_product_snapshotsWhereInput[] = [];
    if (props.body.changedField === "name") {
      orConditions.push({
        OR: [{ name_before: { not: null } }, { name_after: { not: null } }],
      });
    } else if (props.body.changedField === "description") {
      orConditions.push({
        OR: [
          { description_before: { not: null } },
          { description_after: { not: null } },
        ],
      });
    } else if (props.body.changedField === "category") {
      orConditions.push({
        OR: [
          { category_id_before: { not: null } },
          { category_id_after: { not: null } },
        ],
      });
    } else if (props.body.changedField === "price") {
      orConditions.push({
        OR: [
          { base_price_before: { not: null } },
          { base_price_after: { not: null } },
        ],
      });
    } else if (props.body.changedField === "images") {
      orConditions.push({
        OR: [{ images_before: { not: null } }, { images_after: { not: null } }],
      });
    }
    if (orConditions.length > 0) {
      whereInput.OR = orConditions;
    }
  }
  // Fetch snapshots with pagination
  const records =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    ShoppingMallProductSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
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
// import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
// import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerProductsProductIdSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductSnapshot.IRequest;
// }): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
//     ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallProductSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------