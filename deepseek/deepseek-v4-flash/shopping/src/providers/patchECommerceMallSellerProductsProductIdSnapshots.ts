import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductSnapshot";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/ECommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IECommerceMallProductSnapshot.IRequest;
}): Promise<IPageIECommerceMallProductSnapshot.ISummary> {
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.e_commerce_mall_product_snapshotsWhereInput = {
    e_commerce_mall_product_id: props.productId,
  };
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const created_at: Record<string, string> = {};
    if (props.body.created_at_from !== undefined) {
      created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      created_at.lte = props.body.created_at_to;
    }
    whereCondition.created_at = created_at;
  }
  const data = await MyGlobal.prisma.e_commerce_mall_product_snapshots.findMany(
    {
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallProductSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.e_commerce_mall_product_snapshots.count({
    where: whereCondition,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ECommerceMallProductSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductSnapshot";
// import { IPageIECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSellerProductsProductIdSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IECommerceMallProductSnapshot.IRequest;
// }): Promise<IPageIECommerceMallProductSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_product_snapshots.findMany({
//     ...ECommerceMallProductSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallProductSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------