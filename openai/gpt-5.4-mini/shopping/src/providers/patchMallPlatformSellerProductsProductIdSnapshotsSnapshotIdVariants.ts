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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductSnapshotVariantAtSummaryTransformer } from "../transformers/MallPlatformProductSnapshotVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdSnapshotsSnapshotIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshotVariant.IRequest;
}): Promise<IPageIMallPlatformProductSnapshotVariant.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.mall_platform_product_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      mall_platform_product_id: props.productId,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const isAscending = props.body.sort === "created_at:asc";
  const records =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.findMany({
      where: {
        mall_platform_product_snapshot_id: props.snapshotId,
        ...(search === undefined
          ? {}
          : {
              OR: [
                { sku_code: { contains: search, mode: "insensitive" } },
                { option_values: { contains: search, mode: "insensitive" } },
              ],
            }),
      },
      orderBy: [{ created_at: isAscending ? "asc" : "desc" }, { id: "asc" }],
      skip,
      take: limit,
      ...MallPlatformProductSnapshotVariantAtSummaryTransformer.select(),
    });
  const recordsCount =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.count({
      where: {
        mall_platform_product_snapshot_id: props.snapshotId,
        ...(search === undefined
          ? {}
          : {
              OR: [
                { sku_code: { contains: search, mode: "insensitive" } },
                { option_values: { contains: search, mode: "insensitive" } },
              ],
            }),
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
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
// export async function patchMallPlatformSellerProductsProductIdSnapshotsSnapshotIdVariants(props: {
//   seller: SellerPayload;
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