import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductSnapshotVariantAtSummaryTransformer } from "../transformers/MallPlatformProductSnapshotVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdSnapshotsSnapshotIdVariants(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshotVariant.IRequest;
}): Promise<IPageIMallPlatformProductSnapshotVariant.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true },
    });
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        mall_platform_product_id: true,
      },
    });
  if (snapshot.mall_platform_product_id !== product.id) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const where = {
    mall_platform_product_snapshot_id: props.snapshotId,
    ...(search === undefined
      ? {}
      : {
          OR: [
            { sku_code: { contains: search } },
            { option_values: { contains: search } },
          ],
        }),
  } satisfies Prisma.mall_platform_product_snapshot_variantsWhereInput;
  const orderBy = (
    props.body.sort === "sku_code"
      ? [{ sku_code: "asc" as const }, { id: "asc" as const }]
      : props.body.sort === "option_values"
        ? [{ option_values: "asc" as const }, { id: "asc" as const }]
        : [{ created_at: "desc" as const }, { id: "desc" as const }]
  ) satisfies Prisma.mall_platform_product_snapshot_variantsOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformProductSnapshotVariantAtSummaryTransformer.select(),
    });
  const recordsCount =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.count({
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
      MallPlatformProductSnapshotVariantAtSummaryTransformer.transform,
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
// import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
// import { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorProductsProductIdSnapshotsSnapshotIdVariants(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductSnapshotVariant.IRequest;
// }): Promise<IPageIMallPlatformProductSnapshotVariant.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_snapshot_variants.findMany({
//     ...MallPlatformProductSnapshotVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductSnapshotVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------