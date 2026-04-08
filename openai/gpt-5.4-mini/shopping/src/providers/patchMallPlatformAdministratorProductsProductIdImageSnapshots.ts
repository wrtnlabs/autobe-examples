import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImageSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductImageSnapshotAtSummaryTransformer } from "../transformers/MallPlatformProductImageSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdImageSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImageSnapshot.IRequest;
}): Promise<IPageIMallPlatformProductImageSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    mall_platform_product_id: props.productId,
    ...(props.body.changedAtFrom !== undefined ||
    props.body.changedAtTo !== undefined
      ? {
          changed_at: {
            ...(props.body.changedAtFrom !== undefined
              ? { gte: props.body.changedAtFrom }
              : {}),
            ...(props.body.changedAtTo !== undefined
              ? { lte: props.body.changedAtTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.mall_platform_product_image_snapshotsWhereInput;
  const orderBy: Prisma.mall_platform_product_image_snapshotsOrderByWithRelationInput[] =
    props.body.sort === "oldest" || props.body.sort === "changedAtAsc"
      ? [{ changed_at: "asc" }, { id: "asc" }]
      : [{ changed_at: "desc" }, { id: "desc" }];
  const records =
    await MyGlobal.prisma.mall_platform_product_image_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformProductImageSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.mall_platform_product_image_snapshots.count({
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
      MallPlatformProductImageSnapshotAtSummaryTransformer.transform,
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
// import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
// import { IPageIMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImageSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorProductsProductIdImageSnapshots(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductImageSnapshot.IRequest;
// }): Promise<IPageIMallPlatformProductImageSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_image_snapshots.findMany({
//     ...MallPlatformProductImageSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductImageSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------