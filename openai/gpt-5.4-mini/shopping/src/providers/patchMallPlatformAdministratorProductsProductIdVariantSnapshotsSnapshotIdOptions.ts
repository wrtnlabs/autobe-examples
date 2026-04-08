import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductVariantSnapshotOptionAtSummaryTransformer } from "../transformers/MallPlatformProductVariantSnapshotOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdVariantSnapshotsSnapshotIdOptions(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshotOption.IRequest;
}): Promise<IPageIMallPlatformProductVariantSnapshotOption.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          product: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  if (snapshot.product.id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const safeLimit = limit > 0 ? limit : 100;
  const skip = (page - 1) * safeLimit;
  const search = props.body.search;
  const where: Prisma.mall_platform_product_variant_snapshot_optionsWhereInput =
    {
      mall_platform_product_variant_snapshot_id: props.snapshotId,
      ...(search === undefined || search.length === 0
        ? {}
        : {
            OR: [
              { option_key: { contains: search, mode: "insensitive" } },
              { option_value: { contains: search, mode: "insensitive" } },
            ],
          }),
    };
  const orderBy: Prisma.mall_platform_product_variant_snapshot_optionsOrderByWithRelationInput =
    props.body.sort === "option_value_desc"
      ? { option_value: "desc" }
      : props.body.sort === "option_value"
        ? { option_value: "asc" }
        : props.body.sort === "option_key_desc"
          ? { option_key: "desc" }
          : { option_key: "asc" };
  const records =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findMany(
      {
        where,
        orderBy,
        skip,
        take: safeLimit,
        ...MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.transform,
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
// import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
// import { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorProductsProductIdVariantSnapshotsSnapshotIdOptions(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductVariantSnapshotOption.IRequest;
// }): Promise<IPageIMallPlatformProductVariantSnapshotOption.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findMany({
//     ...MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------