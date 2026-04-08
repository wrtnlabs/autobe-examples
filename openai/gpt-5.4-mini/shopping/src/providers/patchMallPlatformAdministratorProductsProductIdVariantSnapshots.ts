import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductVariantSnapshotAtSummaryTransformer } from "../transformers/MallPlatformProductVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdVariantSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshot.IRequest;
}): Promise<IPageIMallPlatformProductVariantSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_product_variant_snapshotsWhereInput = {
    product: { id: props.productId },
    ...(props.body.mallPlatformProductVariantId !== undefined
      ? {
          mall_platform_product_variant_id:
            props.body.mallPlatformProductVariantId,
        }
      : {}),
    ...(props.body.skuCode !== undefined
      ? { sku_code: { contains: props.body.skuCode, mode: "insensitive" } }
      : {}),
    ...(props.body.optionSummary !== undefined
      ? {
          option_summary: {
            contains: props.body.optionSummary,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.priceOverrideMin !== undefined ||
    props.body.priceOverrideMax !== undefined
      ? {
          price_override: {
            ...(props.body.priceOverrideMin !== undefined
              ? { gte: props.body.priceOverrideMin }
              : {}),
            ...(props.body.priceOverrideMax !== undefined
              ? { lte: props.body.priceOverrideMax }
              : {}),
          },
        }
      : {}),
    ...(props.body.snapshotReason !== undefined
      ? {
          snapshot_reason: {
            contains: props.body.snapshotReason,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { sku_code: { contains: props.body.search, mode: "insensitive" } },
            {
              option_summary: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              snapshot_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const records =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...MallPlatformProductVariantSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.count({
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
      MallPlatformProductVariantSnapshotAtSummaryTransformer.transform,
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
// import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
// import { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorProductsProductIdVariantSnapshots(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductVariantSnapshot.IRequest;
// }): Promise<IPageIMallPlatformProductVariantSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_variant_snapshots.findMany({
//     ...MallPlatformProductVariantSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductVariantSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------