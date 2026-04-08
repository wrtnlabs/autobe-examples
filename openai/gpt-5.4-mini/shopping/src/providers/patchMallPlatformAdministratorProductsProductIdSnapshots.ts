import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductSnapshotAtSummaryTransformer } from "../transformers/MallPlatformProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshot.IRequest;
}): Promise<IPageIMallPlatformProductSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    mall_platform_product_id: props.productId,
    ...(props.body.snapshotKind !== undefined &&
    props.body.snapshotKind !== null
      ? { snapshot_kind: props.body.snapshotKind }
      : {}),
  } satisfies Prisma.mall_platform_product_snapshotsWhereInput;
  const orderBy =
    props.body.sort === "oldest"
      ? ({
          created_at: "asc",
        } satisfies Prisma.mall_platform_product_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.mall_platform_product_snapshotsOrderByWithRelationInput);
  const records =
    await MyGlobal.prisma.mall_platform_product_snapshots.findMany({
      ...MallPlatformProductSnapshotAtSummaryTransformer.select(),
      where,
      orderBy,
      skip,
      take: limit,
    });
  const recordsCount =
    await MyGlobal.prisma.mall_platform_product_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformProductSnapshotAtSummaryTransformer.transform,
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
// import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
// import { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorProductsProductIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductSnapshot.IRequest;
// }): Promise<IPageIMallPlatformProductSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_snapshots.findMany({
//     ...MallPlatformProductSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------