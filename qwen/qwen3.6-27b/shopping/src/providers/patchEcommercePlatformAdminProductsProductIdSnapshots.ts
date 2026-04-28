import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSnapshotAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSnapshot.IRequest;
}): Promise<IPageIEcommercePlatformSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.ecommerce_platform_snapshotsWhereInput = {
    entity_type: "product" as const,
    snapshotProduct: {
      ecommerce_platform_product_id: props.productId,
    },
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: props.body.createdAtFrom },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: props.body.createdAtTo },
    }),
    ...(props.body.search !== undefined && {
      AND: [
        {
          snapshotProduct: {
            OR: [
              { name_current: { contains: props.body.search } },
              { description_current: { contains: props.body.search } },
            ],
          },
        },
      ],
    }),
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_platform_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_platform_snapshots.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommercePlatformSnapshot.ISummary;
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
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformAdminProductsProductIdSnapshots(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSnapshot.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshots.findMany({
//     ...EcommercePlatformSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------