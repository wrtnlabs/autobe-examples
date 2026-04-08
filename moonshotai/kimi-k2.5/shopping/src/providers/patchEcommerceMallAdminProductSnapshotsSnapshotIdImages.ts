import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotImageAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductSnapshotsSnapshotIdImages(props: {
  admin: AdminPayload;
  snapshotId: string;
  body: IEcommerceMallProductSnapshotImage.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshotImage.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const displayOrderFilter:
    | {
        gte?: number;
        lte?: number;
      }
    | undefined =
    props.body.displayOrderMin !== undefined ||
    props.body.displayOrderMax !== undefined
      ? {
          ...(props.body.displayOrderMin !== undefined && {
            gte: props.body.displayOrderMin,
          }),
          ...(props.body.displayOrderMax !== undefined && {
            lte: props.body.displayOrderMax,
          }),
        }
      : undefined;
  const whereInput: Prisma.ecommerce_mall_product_snapshot_imagesWhereInput = {
    ecommerce_mall_product_snapshot_id: props.snapshotId,
    ...(displayOrderFilter !== undefined && {
      display_order: displayOrderFilter,
    }),
  };
  const data =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
      ...EcommerceMallProductSnapshotImageAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductSnapshotImageAtSummaryTransformer.transform,
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
// import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
// import { IPageIEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminProductSnapshotsSnapshotIdImages(props: {
//   admin: AdminPayload;
//   snapshotId: string;
//   body: IEcommerceMallProductSnapshotImage.IRequest;
// }): Promise<IPageIEcommerceMallProductSnapshotImage.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findMany({
//     ...EcommerceMallProductSnapshotImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductSnapshotImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------